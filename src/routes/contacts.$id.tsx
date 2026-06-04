import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { HealthBar } from "@/components/HealthBar";
import { Section, Pill, EmptyState, Markdown } from "@/components/ui-bits";
import { ArrowLeft, AlertCircle, Sparkles, Loader2, Plus, Check } from "lucide-react";
import { generateStrategy } from "@/lib/ai.functions";
import { lastContactLabel, typeLabel, folderLabel, gbp } from "@/lib/format";

export const Route = createFileRoute("/contacts/$id")({
  head: () => ({ meta: [{ title: "Contact — ORBIT" }] }),
  component: ContactDetail,
});

function ContactDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const contact = useQuery({ queryKey: ["contact", id], queryFn: () => db.contacts.get(id) });
  const activities = useQuery({ queryKey: ["activities", id], queryFn: () => db.activities.forContact(id) });
  const actions = useQuery({ queryKey: ["actions", id], queryFn: () => db.actions.forContact(id) });
  const quotes = useQuery({ queryKey: ["quotes-c", id], queryFn: () => db.quotes.forContact(id) });
  const tickets = useQuery({ queryKey: ["tickets-c", id], queryFn: () => db.tickets.forContact(id) });
  const allLoans = useQuery({ queryKey: ["loans"], queryFn: db.loans.list });
  const loans = (allLoans.data ?? []).filter(l => l.contact_id === id);

  const [strategyMd, setStrategyMd] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [actionTitle, setActionTitle] = useState("");

  const strategy = useServerFn(generateStrategy);
  const stratM = useMutation({
    mutationFn: () => strategy({ data: {
      contact: contact.data, activities: activities.data ?? [],
      actions: actions.data ?? [], quotes: quotes.data ?? [], tickets: tickets.data ?? [],
    } }),
    onSuccess: (r) => setStrategyMd(r.markdown),
  });

  const addNote = useMutation({
    mutationFn: async () => {
      await db.activities.insert({ contact_id: id, kind: "note", summary: noteText });
      await db.contacts.update(id, { last_contact_date: new Date().toISOString() });
    },
    onSuccess: () => { setNoteText(""); qc.invalidateQueries({ queryKey: ["activities", id] }); qc.invalidateQueries({ queryKey: ["contact", id] }); },
  });

  const addAction = useMutation({
    mutationFn: async () => { await db.actions.insert({ contact_id: id, title: actionTitle }); },
    onSuccess: () => { setActionTitle(""); qc.invalidateQueries({ queryKey: ["actions", id] }); },
  });

  const toggleAction = useMutation({
    mutationFn: async ({ aid, done }: { aid: string; done: boolean }) =>
      db.actions.update(aid, { status: done ? "done" : "open", completed_at: done ? new Date().toISOString() : null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["actions", id] }),
  });

  const toggleUrgent = useMutation({
    mutationFn: async (urgent: boolean) => db.contacts.update(id, { urgent }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact", id] }),
  });

  if (!contact.data) return <Shell title="Loading…"><div /></Shell>;
  const c = contact.data;

  return (
    <Shell title={c.name} subtitle={c.company ?? undefined} action={
      <Link to="/contacts" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
    }>
      <div className="rounded-2xl bg-card border border-border p-4 mb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{c.role}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Pill tone="success">{typeLabel(c.type)}</Pill>
              <Pill>{folderLabel(c.type, c.folder)}</Pill>
              {c.industry && <Pill tone="muted">{c.industry}</Pill>}
            </div>
          </div>
          <button onClick={() => toggleUrgent.mutate(!c.urgent)}
            className={`p-2 rounded-full ${c.urgent ? "bg-[color:var(--urgent)]/20" : "bg-muted"}`}>
            <AlertCircle className="h-5 w-5" style={{ color: c.urgent ? "var(--urgent)" : "var(--muted-foreground)" }} />
          </button>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Health</span>
            <span className="font-semibold tabular-nums">{c.health_score}</span>
          </div>
          <HealthBar score={c.health_score} />
          <div className="flex gap-1 mt-2">
            {[25, 50, 75, 90].map(v => (
              <button key={v} onClick={async () => { await db.contacts.update(id, { health_score: v }); qc.invalidateQueries({ queryKey: ["contact", id] }); }}
                className="flex-1 py-1 text-[10px] rounded bg-muted text-muted-foreground hover:text-foreground">{v}</button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3">Last contact: {lastContactLabel(c.last_contact_date)}</p>
        {c.notes && <p className="text-sm mt-3 text-foreground/90">{c.notes}</p>}
        {c.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-3">{c.tags.map(t => <Pill key={t}>#{t}</Pill>)}</div>
        )}
      </div>

      <button
        onClick={() => stratM.mutate()}
        disabled={stratM.isPending}
        className="w-full mb-4 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold tap disabled:opacity-50"
      >
        {stratM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Generate Strategy
      </button>

      {strategyMd && (
        <div className="rounded-2xl bg-card border border-primary/40 p-4 mb-4">
          <Markdown>{strategyMd}</Markdown>
        </div>
      )}

      <Section title="Open actions">
        <div className="space-y-1.5">
          {(actions.data ?? []).filter(a => a.status === "open").map(a => (
            <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
              <button onClick={() => toggleAction.mutate({ aid: a.id, done: true })}
                className="h-5 w-5 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0">
              </button>
              <span className="text-sm flex-1">{a.title}</span>
              <Pill tone={a.urgency === "critical" || a.urgency === "high" ? "urgent" : "muted"}>{a.urgency}</Pill>
            </div>
          ))}
          {(actions.data ?? []).filter(a => a.status === "done").slice(0, 3).map(a => (
            <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border border-border opacity-60">
              <Check className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm flex-1 line-through">{a.title}</span>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input value={actionTitle} onChange={e => setActionTitle(e.target.value)}
              placeholder="New action…" className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm" />
            <button onClick={() => addAction.mutate()} disabled={!actionTitle}
              className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Section>

      <Section title="Linked quotes">
        {quotes.data?.length === 0 ? <EmptyState title="No quotes" /> : (
          <div className="space-y-1.5">
            {(quotes.data ?? []).map(q => (
              <div key={q.id} className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{q.quote_ref}</p>
                  <p className="text-xs text-muted-foreground truncate">{q.products}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{gbp(Number(q.value))}</p>
                  <Pill tone={q.stage === "won" ? "success" : q.stage === "lost" ? "muted" : "default"}>{q.stage}</Pill>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Loan equipment">
        {loans.length === 0 ? <EmptyState title="No loan equipment" /> : (
          <div className="space-y-1.5">
            {loans.map(l => (
              <div key={l.id} className="p-2.5 rounded-lg bg-card border border-border">
                <p className="text-sm font-medium">{l.product_name}</p>
                <p className="text-xs text-muted-foreground">SN {l.serial_number} · {l.status}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Support tickets">
        {tickets.data?.length === 0 ? <EmptyState title="No tickets" /> : (
          <div className="space-y-1.5">
            {(tickets.data ?? []).map(t => (
              <div key={t.id} className="p-2.5 rounded-lg bg-card border border-border">
                <div className="flex justify-between"><span className="text-sm font-medium">{t.ticket_number}</span><Pill tone={t.priority === "critical" ? "urgent" : "muted"}>{t.priority}</Pill></div>
                <p className="text-xs text-muted-foreground mt-1">{t.issue}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Activity timeline">
        <div className="space-y-2 mb-3">
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={2}
            placeholder="Log a note, call, meeting…"
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm" />
          <button onClick={() => addNote.mutate()} disabled={!noteText}
            className="w-full py-2 rounded-lg bg-secondary text-foreground text-sm font-medium disabled:opacity-50">
            Add to timeline
          </button>
        </div>
        {(activities.data ?? []).length === 0 ? <EmptyState title="No activity yet" /> : (
          <div className="space-y-2">
            {(activities.data ?? []).map(a => (
              <div key={a.id} className="rounded-lg bg-card border border-border p-2.5">
                <div className="flex justify-between gap-2">
                  <p className="text-sm text-foreground/90">{a.summary}</p>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{new Date(a.occurred_at).toLocaleDateString()}</span>
                </div>
                {a.details && <p className="text-xs text-muted-foreground mt-1">{a.details}</p>}
                <div className="flex gap-1 mt-1.5">
                  <Pill tone="muted">{a.kind}</Pill>
                  {a.sentiment && <Pill tone={a.sentiment === "positive" ? "success" : a.sentiment === "negative" ? "urgent" : "muted"}>{a.sentiment}</Pill>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </Shell>
  );
}
