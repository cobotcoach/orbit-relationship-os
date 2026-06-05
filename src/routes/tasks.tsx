import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useRef, useEffect } from "react";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { Pill, EmptyState, Markdown } from "@/components/ui-bits";
import { prioritiseTasks } from "@/lib/ai.functions";
import { CheckSquare, Plus, Sparkles, X, Calendar, User, Loader2 } from "lucide-react";
import type { Action, Contact } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "ORBIT — Tasks" }] }),
  component: TasksPage,
});

type View = "today" | "week" | "all" | "contact";
type Priority = "critical" | "high" | "medium" | "low";

const priorityTone = (p: string): "urgent" | "warning" | "default" | "muted" =>
  p === "critical" || p === "high" ? "urgent" : p === "medium" ? "warning" : "muted";

function isDone(s: string) { return s === "done"; }
function isOpen(s: string) { return s !== "done" && s !== "deferred"; }

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d = new Date()) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function endOfWeek(d = new Date()) { const x = endOfDay(d); x.setDate(x.getDate() + 7); return x; }

function TaskRow({ task, contact, onComplete, onDefer, onOpen, orderHint }: {
  task: Action; contact?: Contact; onComplete: () => void; onDefer: () => void; onOpen: () => void; orderHint?: number;
}) {
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const triggered = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; triggered.current = false; };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const delta = e.touches[0].clientX - startX.current;
    setDx(Math.max(-140, Math.min(140, delta)));
  };
  const onTouchEnd = () => {
    if (!triggered.current) {
      if (dx > 80) { triggered.current = true; onComplete(); }
      else if (dx < -80) { triggered.current = true; onDefer(); }
    }
    setDx(0); startX.current = null;
  };

  const overdue = task.due_date && new Date(task.due_date) < startOfDay() && isOpen(task.status);

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-0 flex items-center justify-between px-4 text-xs font-semibold">
        <span className="text-primary">✓ Complete</span>
        <span className="text-muted-foreground">Defer →</span>
      </div>
      <button
        onClick={onOpen}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${dx}px)` }}
        className="relative w-full text-left bg-card border border-border p-3 transition-transform active:bg-muted/50"
      >
        {orderHint != null && (
          <span className="absolute -left-1 top-2 text-[9px] font-bold text-primary/70 w-5 text-center">{orderHint + 1}</span>
        )}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium leading-snug ${isDone(task.status) ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
            {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Pill tone={priorityTone(task.urgency)}>{task.urgency}</Pill>
              {task.status !== "todo" && task.status !== "open" && <Pill tone="muted">{task.status.replace("_", " ")}</Pill>}
              {task.due_date && (
                <span className={`text-[10px] inline-flex items-center gap-1 ${overdue ? "text-[color:var(--urgent)]" : "text-muted-foreground"}`}>
                  <Calendar className="h-3 w-3" />{new Date(task.due_date).toLocaleDateString()}
                </span>
              )}
              {contact && (
                <span className="text-[10px] text-primary inline-flex items-center gap-1">
                  <User className="h-3 w-3" />{contact.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

function NewTaskSheet({ onClose, contacts }: { onClose: () => void; contacts: Contact[] }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactId, setContactId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  const create = useMutation({
    mutationFn: async () => {
      await db.actions.insert({
        title: title.trim(),
        description: description.trim() || null,
        contact_id: contactId || null,
        due_date: dueDate || null,
        urgency: priority,
        status: "todo",
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["actions"] }); toast.success("Task added"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-xl bg-card border border-border rounded-t-2xl sm:rounded-2xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">New task</h2>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        <textarea className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" placeholder="Description (optional)" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <select className="bg-background border border-border rounded-lg px-2 py-2 text-sm" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input type="date" className="bg-background border border-border rounded-lg px-2 py-2 text-sm" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <select className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" value={contactId} onChange={e => setContactId(e.target.value)}>
          <option value="">No contact</option>
          {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
        </select>
        <button disabled={!title.trim() || create.isPending} onClick={() => create.mutate()} className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50">
          {create.isPending ? "Adding…" : "Add task"}
        </button>
      </div>
    </div>
  );
}

function TasksPage() {
  const qc = useQueryClient();
  const { data: tasks = [] } = useQuery({ queryKey: ["actions"], queryFn: db.actions.list });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: db.contacts.list });
  const contactMap = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);

  const [view, setView] = useState<View>("today");
  const [filterContact, setFilterContact] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [aiOrder, setAiOrder] = useState<string[] | null>(null);
  const [aiSummary, setAiSummary] = useState<string>("");

  const prioritiseFn = useServerFn(prioritiseTasks);
  const prioritise = useMutation({
    mutationFn: async () => {
      const openTasks = tasks.filter(t => isOpen(t.status));
      const relatedContactIds = new Set(openTasks.map(t => t.contact_id).filter(Boolean) as string[]);
      const relevantContacts = contacts.filter(c => relatedContactIds.has(c.id))
        .map(c => ({ id: c.id, name: c.name, company: c.company, health_score: c.health_score, type: c.type, folder: c.folder, urgent: c.urgent }));
      return prioritiseFn({ data: { tasks: openTasks, contacts: relevantContacts } });
    },
    onSuccess: (res) => {
      setAiOrder(res.ordered_ids);
      setAiSummary(res.summary);
      toast.success("Prioritised");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Auto-prioritise once on the Today view if nothing yet
  useEffect(() => {
    if (view === "today" && !aiOrder && !prioritise.isPending && tasks.filter(t => isOpen(t.status)).length > 0) {
      // Don't auto-fire — wait for user click to save credits
    }
  }, [view, aiOrder, prioritise.isPending, tasks]);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Action["status"] }) => {
      await db.actions.update(id, { status, completed_at: status === "done" ? new Date().toISOString() : null });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["actions"] }),
  });

  const filtered = useMemo(() => {
    let list = tasks.slice();
    if (view === "today") {
      const end = endOfDay();
      list = list.filter(t => isOpen(t.status) && (!t.due_date || new Date(t.due_date) <= end));
    } else if (view === "week") {
      const end = endOfWeek();
      list = list.filter(t => isOpen(t.status) && (!t.due_date || new Date(t.due_date) <= end));
    } else if (view === "contact" && filterContact) {
      list = list.filter(t => t.contact_id === filterContact);
    }
    if (view !== "contact") {
      // sort: critical first, then due_date, then created
      const rank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      list.sort((a, b) => (rank[a.urgency] ?? 9) - (rank[b.urgency] ?? 9));
    }
    if (aiOrder && (view === "today" || view === "week")) {
      const idx = new Map(aiOrder.map((id, i) => [id, i]));
      list.sort((a, b) => (idx.get(a.id) ?? 999) - (idx.get(b.id) ?? 999));
    }
    return list;
  }, [tasks, view, filterContact, aiOrder]);

  const openCount = tasks.filter(t => isOpen(t.status)).length;
  const doneToday = tasks.filter(t => t.status === "done" && t.completed_at && new Date(t.completed_at) >= startOfDay()).length;

  return (
    <Shell title="Tasks" subtitle={`${openCount} open · ${doneToday} done today`} action={
      <button onClick={() => prioritise.mutate()} disabled={prioritise.isPending || openCount === 0}
        className="inline-flex items-center gap-1.5 bg-primary/15 text-primary border border-primary/30 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50">
        {prioritise.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        Prioritise
      </button>
    }>
      <div className="flex gap-1 mb-3 bg-card border border-border rounded-xl p-1">
        {(["today", "week", "all", "contact"] as View[]).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-lg capitalize transition-colors ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {v === "week" ? "This Week" : v === "contact" ? "By Contact" : v}
          </button>
        ))}
      </div>

      {view === "today" && aiSummary && (
        <div className="rounded-xl bg-primary/10 border border-primary/30 p-3 mb-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
            <Sparkles className="h-3 w-3" /> Morning Briefing
          </div>
          <Markdown>{aiSummary}</Markdown>
        </div>
      )}

      {view === "contact" && (
        <select value={filterContact} onChange={e => setFilterContact(e.target.value)}
          className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm mb-3">
          <option value="">Select a contact…</option>
          {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
        </select>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={<CheckSquare className="h-7 w-7" />} title="Nothing here" hint="Tap + to add a task" />
      ) : (
        <div className="space-y-2">
          {filtered.map((t, i) => (
            <TaskRow
              key={t.id}
              task={t}
              contact={t.contact_id ? contactMap.get(t.contact_id) : undefined}
              orderHint={aiOrder && (view === "today" || view === "week") ? i : undefined}
              onComplete={() => setStatus.mutate({ id: t.id, status: "done" })}
              onDefer={() => setStatus.mutate({ id: t.id, status: "deferred" })}
              onOpen={() => { if (t.contact_id) window.location.assign(`/contacts/${t.contact_id}`); }}
            />
          ))}
        </div>
      )}

      <button onClick={() => setShowNew(true)}
        className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform">
        <Plus className="h-6 w-6" />
      </button>

      {showNew && <NewTaskSheet onClose={() => setShowNew(false)} contacts={contacts} />}
    </Shell>
  );
}
