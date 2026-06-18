import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { ContactCard } from "@/components/ContactCard";
import { Section, Pill, EmptyState, Markdown } from "@/components/ui-bits";
import { CONTACT_TYPES, FOLDERS_BY_TYPE, ContactType, Contact } from "@/lib/types";
import { Plus, Search, Sparkles, X, Loader2, Sprout } from "lucide-react";
import { generateSegmentBriefing } from "@/lib/ai.functions";
import { folderLabel, typeLabel } from "@/lib/format";
import { useMode } from "@/lib/mode-context";


export const Route = createFileRoute("/contacts/")({
  head: () => ({ meta: [{ title: "ORBIT — Contacts" }] }),
  component: ContactsPage,
});

function ContactsPage() {
  const qc = useQueryClient();
  const { activeMode, modeLabel, modeEmoji } = useMode();
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: db.contacts.list });
  const [activeType, setActiveType] = useState<ContactType>("channel_partner");

  const [activeFolder, setActiveFolder] = useState<string>("active");
  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState<"all" | "low" | "mid" | "high">("all");
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [briefingMd, setBriefingMd] = useState("");

  const briefing = useServerFn(generateSegmentBriefing);
  const briefingM = useMutation({
    mutationFn: async () => {
      const segment = contacts.filter(c => c.type === activeType && c.folder === activeFolder);
      const res = await briefing({ data: { folderLabel: `${typeLabel(activeType)} · ${folderLabel(activeType, activeFolder)}`, contacts: segment } });
      return res.markdown;
    },
    onSuccess: (md) => { setBriefingMd(md); setBriefingOpen(true); },
  });

  const folders = FOLDERS_BY_TYPE[activeType];
  if (!folders.find(f => f.value === activeFolder)) {
    setActiveFolder(folders[0].value);
  }

  // Mode-aware filter
  const modeFiltered = contacts.filter(c => {
    if (!activeMode || activeMode === "dobot") return true;
    if (activeMode === "cobot_coach") {
      return (c.mode_tags ?? []).includes("cobot_coach") || c.type === "prospect" || c.type === "ecosystem_partner";
    }
    return false; // life, wild → no contacts
  });

  const filtered = modeFiltered.filter(c => {
    if (c.type !== activeType) return false;
    if (c.folder !== activeFolder) return false;
    if (search && !`${c.name} ${c.company ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (healthFilter === "low" && c.health_score >= 50) return false;
    if (healthFilter === "mid" && (c.health_score < 50 || c.health_score >= 75)) return false;
    if (healthFilter === "high" && c.health_score < 75) return false;
    return true;
  });

  const lifeOrWild = activeMode === "life" || activeMode === "wild";
  void qc;


  return (
    <Shell
      title="Contacts"
      action={
        <Link to="/contacts/new" className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center tap active:scale-95">
          <Plus className="h-5 w-5" />
        </Link>
      }
    >
      {/* Type tabs */}
      <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 pb-2">
          {CONTACT_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => { setActiveType(t.value); setActiveFolder(FOLDERS_BY_TYPE[t.value][0].value); }}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium tap ${activeType === t.value ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Folder tabs */}
      <div className="-mx-4 px-4 overflow-x-auto no-scrollbar mt-1">
        <div className="flex gap-2 pb-3">
          {folders.map(f => (
            <button
              key={f.value}
              onClick={() => setActiveFolder(f.value)}
              className={`whitespace-nowrap px-3 py-1 rounded-md text-[11px] font-medium tap ${activeFolder === f.value ? "bg-secondary text-foreground border border-primary/40" : "bg-transparent text-muted-foreground border border-border"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or company"
          className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
      </div>

      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex gap-1">
          {(["all","low","mid","high"] as const).map(h => (
            <button key={h} onClick={() => setHealthFilter(h)}
              className={`px-2 py-1 rounded text-[10px] font-medium ${healthFilter === h ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}>
              {h === "all" ? "All" : h === "low" ? "<50" : h === "mid" ? "50-74" : "75+"}
            </button>
          ))}
        </div>
        <button
          onClick={() => briefingM.mutate()}
          disabled={briefingM.isPending || filtered.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 text-primary border border-primary/30 text-xs font-medium tap disabled:opacity-50"
        >
          {briefingM.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Briefing
        </button>
      </div>

      <Section title={`${filtered.length} contact${filtered.length === 1 ? "" : "s"}`}>
        {filtered.length === 0 ? (
          <EmptyState title="No contacts here" hint="Add one using the + button" />
        ) : (
          <div className="space-y-2">{filtered.map(c => <ContactCard key={c.id} contact={c} />)}</div>
        )}
      </Section>

      {briefingOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={() => setBriefingOpen(false)}>
          <div className="w-full max-w-xl mx-auto bg-card border-t border-border rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Segment Briefing</h2>
              </div>
              <button onClick={() => setBriefingOpen(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{typeLabel(activeType)} · {folderLabel(activeType, activeFolder)}</p>
            <Markdown>{briefingMd}</Markdown>
          </div>
        </div>
      )}
    </Shell>
  );
}

// Helper used elsewhere
export function _contacts(_: Contact[]) {}
