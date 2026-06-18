import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { Pill, EmptyState, Markdown } from "@/components/ui-bits";
import { refreshTopicsFromText, extractTopicsFromText } from "@/lib/ai.functions";
import { MessagesSquare, Plus, Sparkles, X, Loader2, Check, ArrowRight, AlertTriangle } from "lucide-react";
import type { SmartTopic, Contact, TopicStatus } from "@/lib/types";
import { useMode } from "@/lib/mode-context";
import { toast } from "sonner";


export const Route = createFileRoute("/topics")({
  head: () => ({ meta: [{ title: "ORBIT — Smart Topics" }] }),
  component: TopicsPage,
});

type Filter = "all" | "need_action" | "waiting" | "stalled";

const STATUSES: { value: TopicStatus; label: string }[] = [
  { value: "waiting_on_you", label: "Waiting on you" },
  { value: "waiting_on_them", label: "Waiting on them" },
  { value: "active", label: "Active" },
  { value: "stalled", label: "Stalled" },
  { value: "resolved", label: "Resolved" },
];

function borderClass(status: string) {
  if (status === "waiting_on_you") return "border-l-[color:var(--urgent)]";
  if (status === "waiting_on_them") return "border-l-amber-500";
  if (status === "active") return "border-l-green-500";
  return "border-l-muted-foreground/40";
}

function statusTone(s: string): "urgent" | "warning" | "success" | "muted" | "default" {
  if (s === "waiting_on_you") return "urgent";
  if (s === "waiting_on_them") return "warning";
  if (s === "active") return "success";
  if (s === "resolved") return "default";
  return "muted";
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function findContactId(hint: string | null, contacts: Contact[]): string | null {
  if (!hint) return null;
  const h = hint.toLowerCase();
  const exact = contacts.find(c => c.name.toLowerCase() === h || c.email?.toLowerCase() === h);
  if (exact) return exact.id;
  const partial = contacts.find(c => c.name.toLowerCase().includes(h) || h.includes(c.name.toLowerCase()));
  return partial?.id ?? null;
}

function TopicCard({ topic, contact, onUpdate }: { topic: SmartTopic; contact?: Contact; onUpdate: (patch: Partial<SmartTopic>) => void }) {
  const opened = daysSince(topic.opened_at);
  const idle = daysSince(topic.last_activity);
  const showNudge = idle >= 14 && topic.status !== "resolved";
  return (
    <div className={`rounded-xl bg-card border border-border border-l-4 ${borderClass(topic.status)} p-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {contact && (
            <p className="text-[11px] text-primary font-semibold truncate">
              {contact.name}{contact.company ? ` · ${contact.company}` : ""}
            </p>
          )}
          <p className="text-sm font-semibold leading-snug mt-0.5">{topic.title}</p>
          {topic.last_update && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{topic.last_update}</p>
          )}
          {topic.next_action && (
            <p className="text-xs mt-1.5 inline-flex items-center gap-1 text-foreground/90">
              <ArrowRight className="h-3 w-3 text-primary" />{topic.next_action}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Pill tone={statusTone(topic.status)}>{topic.status.replace(/_/g, " ")}</Pill>
            <span className="text-[10px] text-muted-foreground">{opened}d open · {idle}d idle</span>
          </div>
          {showNudge && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2 py-1.5 text-[11px] text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>Stalled {idle}d — nudge {contact?.name ?? "the contact"} with a quick check-in.</span>
            </div>
          )}
        </div>
        <select
          value={topic.status}
          onChange={(e) => onUpdate({ status: e.target.value as TopicStatus, last_activity: new Date().toISOString() })}
          className="text-[10px] bg-background border border-border rounded px-1 py-0.5"
        >
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
    </div>
  );
}

function NewTopicSheet({ onClose, contacts }: { onClose: () => void; contacts: Contact[] }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [contactId, setContactId] = useState("");
  const [status, setStatus] = useState<TopicStatus>("active");
  const [nextAction, setNextAction] = useState("");

  const create = useMutation({
    mutationFn: () => db.topics.insert({
      title: title.trim(),
      contact_id: contactId || null,
      status,
      next_action: nextAction.trim() || null,
      source: "manual",
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["topics"] }); toast.success("Topic added"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-xl bg-card border border-border rounded-t-2xl sm:rounded-2xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">New topic</h2>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" placeholder="What's it about?" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        <select className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" value={contactId} onChange={e => setContactId(e.target.value)}>
          <option value="">No contact</option>
          {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
        </select>
        <select className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => setStatus(e.target.value as TopicStatus)}>
          {STATUSES.filter(s => s.value !== "resolved").map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" placeholder="Next action (optional)" value={nextAction} onChange={e => setNextAction(e.target.value)} />
        <button disabled={!title.trim() || create.isPending} onClick={() => create.mutate()} className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50">
          {create.isPending ? "Adding…" : "Add topic"}
        </button>
      </div>
    </div>
  );
}

function RefreshSheet({ onClose, topics, contacts }: { onClose: () => void; topics: SmartTopic[]; contacts: Contact[] }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [diff, setDiff] = useState<{ updates: number; created: number; resolved: number; summary: string } | null>(null);
  const refreshFn = useServerFn(refreshTopicsFromText);
  const contactById = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);

  const run = useMutation({
    mutationFn: async () => {
      const payloadTopics = topics.map(t => ({
        id: t.id, title: t.title, status: t.status,
        contact_name: t.contact_id ? contactById.get(t.contact_id)?.name ?? null : null,
        last_update: t.last_update,
      }));
      const payloadContacts = contacts.map(c => ({ id: c.id, name: c.name, company: c.company }));
      const res = await refreshFn({ data: { text, topics: payloadTopics, contacts: payloadContacts } });

      let updates = 0, resolved = 0, created = 0;
      for (const u of res.updates ?? []) {
        const patch: Partial<SmartTopic> = { last_activity: new Date().toISOString() };
        if (u.resolved) { patch.status = "resolved"; resolved++; }
        else if (u.status) patch.status = u.status as TopicStatus;
        if (u.last_update) patch.last_update = u.last_update;
        if (u.next_action !== undefined) patch.next_action = u.next_action;
        await db.topics.update(u.id, patch);
        if (!u.resolved) updates++;
      }
      for (const n of res.new_topics ?? []) {
        await db.topics.insert({
          title: n.title,
          status: (n.status as TopicStatus) ?? "active",
          last_update: n.last_update,
          next_action: n.next_action,
          contact_id: findContactId(n.contact_hint, contacts),
          source: "inbox",
        });
        created++;
      }
      return { updates, created, resolved, summary: res.summary };
    },
    onSuccess: (d) => { setDiff(d); qc.invalidateQueries({ queryKey: ["topics"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-xl bg-card border border-border rounded-t-2xl sm:rounded-2xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Refresh with AI</h2>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        {!diff ? (
          <>
            <p className="text-xs text-muted-foreground">Paste a new email, meeting transcript, or Plaud note. Claude will update statuses, create new topics, and mark resolved ones.</p>
            <textarea rows={10} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" placeholder="Paste here…" value={text} onChange={e => setText(e.target.value)} />
            <button disabled={!text.trim() || run.isPending} onClick={() => run.mutate()} className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {run.isPending ? "Analysing…" : "Refresh topics"}
            </button>
            {run.error && <p className="text-xs text-[color:var(--urgent)]">{(run.error as Error).message}</p>}
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-primary/10 border border-primary/30 p-3">
              <Markdown>{diff.summary || "Done."}</Markdown>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-background border border-border p-2"><p className="text-lg font-bold">{diff.created}</p><p className="text-[10px] text-muted-foreground">created</p></div>
              <div className="rounded-lg bg-background border border-border p-2"><p className="text-lg font-bold">{diff.updates}</p><p className="text-[10px] text-muted-foreground">updated</p></div>
              <div className="rounded-lg bg-background border border-border p-2"><p className="text-lg font-bold">{diff.resolved}</p><p className="text-[10px] text-muted-foreground">resolved</p></div>
            </div>
            <button onClick={onClose} className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1.5">
              <Check className="h-4 w-4" /> Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TopicsPage() {
  const qc = useQueryClient();
  const { activeMode, modeLabel, modeEmoji } = useMode();
  const { data: topics = [] } = useQuery({ queryKey: ["topics"], queryFn: db.topics.list });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: db.contacts.list });
  const contactMap = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);
  const [filter, setFilter] = useState<Filter>("all");
  const [showNew, setShowNew] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);

  const scoped = useMemo(
    () => (activeMode ? topics.filter(t => t.mode === activeMode) : topics),
    [topics, activeMode],
  );



  // Auto-mark stalled
  const computed = useMemo(() => topics.map(t => {
    if (t.status !== "resolved" && t.status !== "stalled" && daysSince(t.last_activity) >= 14) {
      return { ...t, status: "stalled" as TopicStatus };
    }
    return t;
  }), [topics]);

  const filtered = useMemo(() => {
    let list = computed.filter(t => t.status !== "resolved");
    if (filter === "need_action") list = list.filter(t => t.status === "waiting_on_you");
    else if (filter === "waiting") list = list.filter(t => t.status === "waiting_on_them");
    else if (filter === "stalled") list = list.filter(t => t.status === "stalled");
    const rank: Record<string, number> = { waiting_on_you: 0, active: 1, waiting_on_them: 2, stalled: 3 };
    list.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9));
    return list;
  }, [computed, filter]);

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SmartTopic> }) => db.topics.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });

  const counts = {
    all: computed.filter(t => t.status !== "resolved").length,
    need_action: computed.filter(t => t.status === "waiting_on_you").length,
    waiting: computed.filter(t => t.status === "waiting_on_them").length,
    stalled: computed.filter(t => t.status === "stalled").length,
  };

  return (
    <Shell title="Smart Topics" subtitle={`${counts.all} open · ${counts.need_action} need action`} action={
      <button onClick={() => setShowRefresh(true)}
        className="inline-flex items-center gap-1.5 bg-primary/15 text-primary border border-primary/30 rounded-lg px-2.5 py-1.5 text-xs font-semibold">
        <Sparkles className="h-3.5 w-3.5" /> Refresh with AI
      </button>
    }>
      <div className="flex gap-1 mb-3 bg-card border border-border rounded-xl p-1">
        {([
          ["all", "All", counts.all],
          ["need_action", "Need action", counts.need_action],
          ["waiting", "Waiting", counts.waiting],
          ["stalled", "Stalled", counts.stalled],
        ] as [Filter, string, number][]).map(([v, label, n]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`flex-1 text-[11px] font-medium py-1.5 rounded-lg transition-colors ${filter === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {label} <span className="opacity-70">{n}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<MessagesSquare className="h-7 w-7" />} title="No topics here" hint="Tap + or Refresh with AI" />
      ) : (
        <div className="space-y-2">
          {filtered.map(t => (
            <TopicCard
              key={t.id}
              topic={t}
              contact={t.contact_id ? contactMap.get(t.contact_id) : undefined}
              onUpdate={(patch) => update.mutate({ id: t.id, patch })}
            />
          ))}
        </div>
      )}

      <button onClick={() => setShowNew(true)}
        className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform">
        <Plus className="h-6 w-6" />
      </button>

      {showNew && <NewTopicSheet onClose={() => setShowNew(false)} contacts={contacts} />}
      {showRefresh && <RefreshSheet onClose={() => setShowRefresh(false)} topics={topics} contacts={contacts} />}
    </Shell>
  );
}

// quiet unused-import warning for extractTopicsFromText (exposed for future paste-to-extract)
void extractTopicsFromText;
