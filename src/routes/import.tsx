import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { Section, Pill, EmptyState } from "@/components/ui-bits";
import { Sparkles, Loader2, Check, Mail, FileText, ClipboardPaste, ArrowLeft, Upload } from "lucide-react";
import { extractImportData } from "@/lib/ai.functions";
import type { Contact, ContactType } from "@/lib/types";

export const Route = createFileRoute("/import")({
  head: () => ({ meta: [{ title: "ORBIT — Import Data" }] }),
  component: ImportPage,
});

type ExtractResult = Awaited<ReturnType<typeof extractImportData>>;
type ExtractedContact = ExtractResult["contacts"][number];

type Summary = { added: number; existed: number; actions: number; intel: number };

type Tab = "email" | "csv" | "paste";

function ImportPage() {
  const [tab, setTab] = useState<Tab>("email");
  return (
    <Shell
      title="Import Data"
      subtitle="Bulk-import contacts, intel & actions"
      action={
        <Link to="/" className="h-9 w-9 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center tap active:scale-95">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      }
    >
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-card border border-border mb-4">
        <TabBtn active={tab === "email"} onClick={() => setTab("email")} icon={<Mail className="h-3.5 w-3.5" />} label="Email" />
        <TabBtn active={tab === "csv"} onClick={() => setTab("csv")} icon={<FileText className="h-3.5 w-3.5" />} label="CSV" />
        <TabBtn active={tab === "paste"} onClick={() => setTab("paste")} icon={<ClipboardPaste className="h-3.5 w-3.5" />} label="Paste" />
      </div>
      {tab === "email" && <ExtractTab mode="email" placeholder="Paste raw email data — headers, threads, CSV/PST export text…" />}
      {tab === "csv" && <CsvTab />}
      {tab === "paste" && <ExtractTab mode="generic" placeholder="Paste anything — meeting notes, LinkedIn export, CRM dump, spreadsheet…" />}
    </Shell>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
    >
      {icon}{label}
    </button>
  );
}

function SummaryCard({ s }: { s: Summary }) {
  return (
    <div className="rounded-xl bg-card border border-primary/40 p-3 grid grid-cols-4 gap-2 text-center">
      <Stat n={s.added} l="Added" />
      <Stat n={s.existed} l="Existed" />
      <Stat n={s.actions} l="Actions" />
      <Stat n={s.intel} l="Intel" />
    </div>
  );
}
function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div>
      <p className="text-xl font-bold">{n}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</p>
    </div>
  );
}

function ExtractTab({ mode, placeholder }: { mode: "email" | "generic"; placeholder: string }) {
  const qc = useQueryClient();
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: db.contacts.list });
  const [text, setText] = useState("");
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [summary, setSummary] = useState<Summary | null>(null);

  const extract = useServerFn(extractImportData);
  const extractM = useMutation({
    mutationFn: async () => extract({ data: { text, mode } }),
    onSuccess: (r) => {
      setResult(r);
      setSelected(new Set(r.contacts.map((_, i) => i)));
      setSummary(null);
    },
  });

  const wordCount = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text]);

  const importM = useMutation({
    mutationFn: async () => {
      if (!result) return;
      const chosen = result.contacts.filter((_, i) => selected.has(i));
      const s: Summary = { added: 0, existed: 0, actions: 0, intel: 0 };
      const byHint = new Map<string, string>(); // hint(name/email) → contact id
      const existingByEmail = new Map(contacts.filter(c => c.email).map(c => [c.email!.toLowerCase(), c]));
      const existingByName = new Map(contacts.map(c => [c.name.toLowerCase().trim(), c]));

      for (const c of chosen) {
        const emailKey = c.email?.toLowerCase();
        const nameKey = c.name.toLowerCase().trim();
        const existing = (emailKey && existingByEmail.get(emailKey)) || existingByName.get(nameKey);
        if (existing) {
          s.existed++;
          if (c.email) byHint.set(c.email.toLowerCase(), existing.id);
          byHint.set(nameKey, existing.id);
          continue;
        }
        const inserted = await db.contacts.insert({
          name: c.name,
          email: c.email,
          company: c.company,
          role: c.role,
          type: (c.suggested_type as ContactType) || "prospect",
          folder: c.suggested_folder || "warm",
          tags: c.tags ?? [],
          notes: c.rationale,
          health_score: 50,
        });
        s.added++;
        if (c.email) byHint.set(c.email.toLowerCase(), inserted.id);
        byHint.set(nameKey, inserted.id);
      }

      const resolveHint = (h: string | null): string | null => {
        if (!h) return null;
        return byHint.get(h.toLowerCase().trim()) ?? null;
      };

      for (const a of result.actions) {
        await db.actions.insert({
          title: a.title,
          urgency: (a.urgency as never) || "medium",
          contact_id: resolveHint(a.contact_hint),
        });
        s.actions++;
      }
      for (const it of result.intel) {
        const cid = resolveHint(it.contact_hint);
        await db.intel.insert({
          source: mode === "email" ? "email_import" : "data_import",
          raw_input: it.summary,
          summary: it.summary,
          topics: it.topics ?? [],
          sentiment: it.sentiment,
          urgency: it.urgency,
          contact_ids: cid ? [cid] : [],
          extracted: it as never,
        });
        if (cid) {
          await db.activities.insert({ contact_id: cid, kind: "intelligence", summary: it.summary, sentiment: it.sentiment });
        }
        s.intel++;
      }
      return s;
    },
    onSuccess: (s) => {
      if (!s) return;
      setSummary(s);
      setResult(null);
      setText("");
      setSelected(new Set());
      qc.invalidateQueries();
    },
  });

  return (
    <div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={10}
        placeholder={placeholder}
        className="w-full bg-card border border-border rounded-xl p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary"
      />
      <p className="text-[10px] text-muted-foreground mt-1">{wordCount.toLocaleString()} words · large dumps are chunked automatically</p>
      <button
        onClick={() => extractM.mutate()}
        disabled={!text || extractM.isPending}
        className="w-full mt-3 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
      >
        {extractM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {mode === "email" ? "Extract & Import Contacts" : "Extract with AI"}
      </button>

      {extractM.isError && <p className="mt-2 text-xs text-[color:var(--urgent)]">{(extractM.error as Error).message}</p>}

      {summary && (
        <div className="mt-5">
          <Section title="Import complete"><SummaryCard s={summary} /></Section>
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-4">
          <Section title={`Found contacts (${result.contacts.length})`}>
            {result.contacts.length === 0 ? <EmptyState title="No contacts found" /> : (
              <div className="space-y-1.5">
                {result.contacts.map((c, i) => (
                  <ContactPreviewRow key={i} c={c} selected={selected.has(i)} onToggle={() => {
                    const next = new Set(selected);
                    next.has(i) ? next.delete(i) : next.add(i);
                    setSelected(next);
                  }} existing={contacts} />
                ))}
              </div>
            )}
          </Section>

          <Section title={`Actions (${result.actions.length})`}>
            {result.actions.length === 0 ? <p className="text-xs text-muted-foreground">None.</p> : (
              <div className="space-y-1.5">
                {result.actions.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
                    <span className="text-sm flex-1">{a.title}</span>
                    <Pill tone={a.urgency === "critical" || a.urgency === "high" ? "urgent" : "muted"}>{a.urgency}</Pill>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Intel (${result.intel.length})`}>
            {result.intel.length === 0 ? <p className="text-xs text-muted-foreground">None.</p> : (
              <div className="space-y-1.5">
                {result.intel.map((it, i) => (
                  <div key={i} className="p-2 rounded-lg bg-card border border-border">
                    <p className="text-sm">{it.summary}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <Pill tone={it.urgency === "critical" || it.urgency === "high" ? "urgent" : "muted"}>{it.urgency}</Pill>
                      <Pill tone={it.sentiment === "positive" ? "success" : it.sentiment === "negative" ? "urgent" : "muted"}>{it.sentiment}</Pill>
                      {it.topics.slice(0, 4).map(t => <Pill key={t}>#{t}</Pill>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <button
            onClick={() => importM.mutate()}
            disabled={importM.isPending || selected.size === 0}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
          >
            {importM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Import {selected.size} contact{selected.size === 1 ? "" : "s"} + {result.actions.length} actions + {result.intel.length} intel
          </button>
        </div>
      )}
    </div>
  );
}

function ContactPreviewRow({ c, selected, onToggle, existing }: { c: ExtractedContact; selected: boolean; onToggle: () => void; existing: Contact[] }) {
  const isExisting = useMemo(() => {
    const emailKey = c.email?.toLowerCase();
    const nameKey = c.name.toLowerCase().trim();
    return existing.some(x => (emailKey && x.email?.toLowerCase() === emailKey) || x.name.toLowerCase().trim() === nameKey);
  }, [c, existing]);
  return (
    <label className={`flex items-start gap-2 p-2 rounded-lg bg-card border ${selected ? "border-primary/50" : "border-border"} cursor-pointer`}>
      <input type="checkbox" checked={selected} onChange={onToggle} className="mt-1 accent-primary" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{c.name}</p>
          {isExisting && <Pill tone="muted">exists</Pill>}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {[c.role, c.company].filter(Boolean).join(" · ")}{c.email ? ` · ${c.email}` : ""}
        </p>
        <div className="flex gap-1 mt-1 flex-wrap">
          <Pill tone="success">{c.suggested_type}</Pill>
          <Pill>{c.suggested_folder}</Pill>
          {c.tags?.slice(0, 3).map(t => <Pill key={t}>#{t}</Pill>)}
        </div>
        {c.rationale && <p className="text-[11px] text-primary mt-1">{c.rationale}</p>}
      </div>
    </label>
  );
}

// --- CSV Tab ---

type CsvRow = Record<string, string>;

function parseCSV(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { if (inQ && text[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === "\n" && !inQ) { lines.push(cur); cur = ""; }
    else if (ch === "\r" && !inQ) { /* skip */ }
    else cur += ch;
  }
  if (cur) lines.push(cur);
  if (lines.length === 0) return { headers: [], rows: [] };
  const split = (line: string): string[] => {
    const out: string[] = []; let c = ""; let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (q && line[i + 1] === '"') { c += '"'; i++; } else q = !q; }
      else if (ch === "," && !q) { out.push(c); c = ""; }
      else c += ch;
    }
    out.push(c); return out;
  };
  const headers = split(lines[0]).map(h => h.trim());
  const rows = lines.slice(1).filter(l => l.trim()).map(l => {
    const vals = split(l);
    const r: CsvRow = {};
    headers.forEach((h, i) => { r[h] = (vals[i] ?? "").trim(); });
    return r;
  });
  return { headers, rows };
}

const FIELD_HINTS: { field: string; aliases: string[] }[] = [
  { field: "name", aliases: ["name", "full name", "fullname", "contact", "contact name", "first name"] },
  { field: "email", aliases: ["email", "e-mail", "email address", "mail"] },
  { field: "company", aliases: ["company", "organisation", "organization", "account", "employer"] },
  { field: "role", aliases: ["role", "title", "job title", "position"] },
  { field: "phone", aliases: ["phone", "mobile", "telephone", "tel"] },
];

function autoMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const { field, aliases } of FIELD_HINTS) {
    const h = headers.find(h => aliases.includes(h.toLowerCase()));
    if (h) map[field] = h;
  }
  return map;
}

function CsvTab() {
  const qc = useQueryClient();
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: db.contacts.list });
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (f: File | null) => {
    setError(null); setSummary(null);
    if (!f) return;
    const text = await f.text();
    const parsed = parseCSV(text);
    if (parsed.rows.length === 0) { setError("No rows found in CSV."); return; }
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMap(autoMap(parsed.headers));
  };

  const importM = useMutation({
    mutationFn: async () => {
      const s: Summary = { added: 0, existed: 0, actions: 0, intel: 0 };
      const existingByEmail = new Map(contacts.filter(c => c.email).map(c => [c.email!.toLowerCase(), c]));
      const existingByName = new Map(contacts.map(c => [c.name.toLowerCase().trim(), c]));
      for (const r of rows) {
        const name = (map.name && r[map.name]) || "";
        if (!name) continue;
        const email = (map.email && r[map.email]) || null;
        const emailKey = email?.toLowerCase();
        const exists = (emailKey && existingByEmail.get(emailKey)) || existingByName.get(name.toLowerCase().trim());
        if (exists) { s.existed++; continue; }
        await db.contacts.insert({
          name,
          email,
          company: (map.company && r[map.company]) || null,
          role: (map.role && r[map.role]) || null,
          phone: (map.phone && r[map.phone]) || null,
          type: "prospect",
          folder: "warm",
          health_score: 50,
          tags: [],
        });
        s.added++;
      }
      return s;
    },
    onSuccess: (s) => {
      setSummary(s); setRows([]); setHeaders([]); setMap({});
      qc.invalidateQueries();
    },
  });

  return (
    <div>
      <label className="block">
        <div className="rounded-xl border-2 border-dashed border-border bg-card p-6 text-center cursor-pointer hover:border-primary transition">
          <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Upload CSV file</p>
          <p className="text-xs text-muted-foreground mt-1">Columns auto-mapped</p>
        </div>
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => onFile(e.target.files?.[0] ?? null)} />
      </label>

      {error && <p className="mt-2 text-xs text-[color:var(--urgent)]">{error}</p>}

      {summary && (
        <div className="mt-5">
          <Section title="Import complete"><SummaryCard s={summary} /></Section>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-5 space-y-4">
          <Section title={`Column mapping (${rows.length} rows)`}>
            <div className="space-y-2">
              {FIELD_HINTS.map(({ field }) => (
                <div key={field} className="flex items-center gap-2">
                  <span className="text-xs w-20 text-muted-foreground capitalize">{field}</span>
                  <select
                    value={map[field] ?? ""}
                    onChange={e => setMap({ ...map, [field]: e.target.value })}
                    className="flex-1 bg-card border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">— ignore —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </Section>

          <Section title={`Preview (first ${Math.min(5, rows.length)})`}>
            <div className="space-y-1.5">
              {rows.slice(0, 5).map((r, i) => (
                <div key={i} className="p-2 rounded-lg bg-card border border-border">
                  <p className="text-sm font-medium">{(map.name && r[map.name]) || <span className="text-muted-foreground">(no name)</span>}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[map.role && r[map.role], map.company && r[map.company]].filter(Boolean).join(" · ")}
                    {map.email && r[map.email] ? ` · ${r[map.email]}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <button
            onClick={() => importM.mutate()}
            disabled={importM.isPending || !map.name}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
          >
            {importM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Import {rows.length} rows
          </button>
          {!map.name && <p className="text-[11px] text-[color:var(--warning)] text-center">Map the Name column to continue.</p>}
        </div>
      )}
    </div>
  );
}
