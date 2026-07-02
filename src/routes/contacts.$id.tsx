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
import { lastContactLabel, typeLabel, folderLabel } from "@/lib/format";

export const Route = createFileRoute("/contacts/$id")({
  head: () => ({ meta: [{ title: "Partner — Mawson" }] }),
  component: ContactDetail,
});

function ContactDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const contact = useQuery({ queryKey: ["contact", id], queryFn: () => db.contacts.get(id) });
  const activities = useQuery({ queryKey: ["activities", id], queryFn: () => db.activities.forContact(id) });
  const actions = useQuery({ queryKey: ["actions", id], queryFn: () => db.actions.forContact(id) });
  const topics = useQuery({ queryKey: ["topics-c", id], queryFn: () => db.topics.forContact(id) });

  const [strategyMd, setStrategyMd] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [actionTitle, setActionTitle] = useState("");

  const strategy = useServerFn(generateStrategy);
  const stratM = useMutation({
    mutationFn: () => strategy({ data: {
      contact: contact.data, activities: activities.data ?? [],
      actions: actions.data ?? [], quotes: [], tickets: [],
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
    mutationFn: async () => { await db.actions.insert({ contact_id: id, title: actionTitle, urgency: "medium", status: "open" }); },
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
      <Link to="/contacts" className="text-muted-foreground p-2"><ArrowLeft className="h-5 w-5" /></Link>
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
            <AlertCircle className="h-5 w-5" style={{ color: c.urgent ? "var(--urgent)" : "var(--muted-fg)" }} />
          </button>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Health</span>
            <span className="font-semibold tabular-nums">{c.health_score}</span>
          </div>
          <HealthBar score={c.health_score} />
        </div>

        <p className="text-xs text-muted-foreground mt-3">Last contact: {lastContactLabel(c.last_contact_date)}</p>
        {c.notes && <p className="text-sm mt-3 text-foreground/90">{c.notes}</p>}
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

      <Section title="Open topics">
        {(topics.data ?? []).filter(t => t.status !== "resolved").length === 0 ? <EmptyState title="No open topics" /> : (
          <div className="space-y-1.5">
            {(topics.data ?? []).filter(t => t.status !== "resolved").map(t => (
              <div key={t.id} className="p-2.5 rounded-lg bg-card border border-border">
                <div className="flex justify-between gap-2">
                  <p className="text-sm font-medium">{t.title}</p>
                  <Pill tone={t.status === "waiting_on_you" ? "urgent" : t.status === "waiting_on_them" ? "warning" : t.status === "stalled" ? "muted" : "success"}>{t.status.replace(/_/g, " ")}</Pill>
                </div>
                {t.last_update && <p className="text-xs text-muted-foreground mt-1">{t.last_update}</p>}
                {t.next_action && <p className="text-xs text-foreground/90 mt-1">→ {t.next_action}</p>}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Open actions">
        <div className="space-y-1.5">
          {(actions.data ?? []).filter(a => a.status !== "done").map(a => (
            <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
              <button onClick={() => toggleAction.mutate({ aid: a.id, done: true })}
                className="h-6 w-6 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0">
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
              placeholder="New action…" className="flex-1" />
            <button onClick={() => addAction.mutate()} disabled={!actionTitle}
              className="h-11 w-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50">
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </Section>

      <Section title="Activity timeline">
        <div className="space-y-2 mb-3">
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={2}
            placeholder="Log a note, call, meeting…" />
          <button onClick={() => addNote.mutate()} disabled={!noteText}
            className="w-full py-3 rounded-lg bg-secondary text-foreground text-sm font-semibold disabled:opacity-50">
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
              </div>
            ))}
          </div>
        )}
      </Section>
    </Shell>
  );
}
