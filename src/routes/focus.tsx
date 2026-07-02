import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { EmptyState } from "@/components/ui-bits";
import { Zap, Check, ChevronDown, ChevronUp, Trash2, Plus } from "lucide-react";
import type { Action } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/focus")({
  head: () => ({ meta: [{ title: "Mawson — Today's Actions" }] }),
  component: FocusPage,
});

type Urgency = "low" | "medium" | "high" | "critical";

const URG_TONE: Record<Urgency, string> = {
  critical: "#ef4444",
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#8892a4",
};

function bucket(u: Urgency): "now" | "week" | "later" {
  if (u === "critical" || u === "high") return "now";
  if (u === "medium") return "week";
  return "later";
}

function FocusPage() {
  const qc = useQueryClient();
  const { data: actions = [] } = useQuery({ queryKey: ["actions"], queryFn: db.actions.list });
  const [newTitle, setNewTitle] = useState("");

  const add = useMutation({
    mutationFn: async (title: string) => db.actions.insert({ title, urgency: "medium", status: "open" }),
    onSuccess: () => { setNewTitle(""); qc.invalidateQueries({ queryKey: ["actions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Action> }) => db.actions.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["actions"] }),
  });

  const open = actions.filter(a => a.status !== "done" && a.status !== "deferred");
  const cols = {
    now:   open.filter(a => bucket(a.urgency) === "now"),
    week:  open.filter(a => bucket(a.urgency) === "week"),
    later: open.filter(a => bucket(a.urgency) === "later"),
  };

  return (
    <Shell title="Today's Actions" subtitle={`${open.length} open`}>
      <form
        onSubmit={(e) => { e.preventDefault(); if (newTitle.trim()) add.mutate(newTitle.trim()); }}
        className="mb-5 flex gap-2"
      >
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="What needs to happen?"
          className="flex-1"
        />
        <button
          type="submit"
          disabled={!newTitle.trim() || add.isPending}
          className="h-11 px-4 rounded-lg bg-primary text-primary-foreground font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>

      {open.length === 0 ? (
        <EmptyState
          icon={<Zap className="h-7 w-7" />}
          title="Nothing urgent. Go build something."
          hint="Add an action above, or open Mission Control."
        />
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          <Column title="NOW" tone="#ef4444" items={cols.now} onUpdate={(id, patch) => update.mutate({ id, patch })} />
          <Column title="THIS WEEK" tone="#f59e0b" items={cols.week} onUpdate={(id, patch) => update.mutate({ id, patch })} />
          <Column title="LATER" tone="#8892a4" items={cols.later} onUpdate={(id, patch) => update.mutate({ id, patch })} />
        </div>
      )}
    </Shell>
  );
}

function Column({ title, tone, items, onUpdate }: {
  title: string; tone: string; items: Action[];
  onUpdate: (id: string, patch: Partial<Action>) => void;
}) {
  return (
    <div>
      <h2 className="text-[11px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color: tone }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
        {title} <span className="opacity-60">({items.length})</span>
      </h2>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-xs text-muted-foreground italic py-2">Empty.</p>}
        {items.map(a => <ActionRow key={a.id} action={a} onUpdate={(p) => onUpdate(a.id, p)} />)}
      </div>
    </div>
  );
}

function ActionRow({ action, onUpdate }: { action: Action; onUpdate: (patch: Partial<Action>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const tone = URG_TONE[action.urgency];
  return (
    <div
      className="rounded-xl bg-card border border-border overflow-hidden"
      style={{ borderLeft: `3px solid ${tone}` }}
    >
      <div className="p-3 flex items-start gap-2">
        <button
          onClick={() => onUpdate({ status: "done", completed_at: new Date().toISOString() })}
          aria-label="Mark done"
          className="shrink-0 h-7 w-7 rounded-full border-2 flex items-center justify-center hover:bg-success/20 transition-colors"
          style={{ borderColor: "var(--success)" }}
        >
          <Check className="h-4 w-4 text-success opacity-0 hover:opacity-100" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{action.title}</p>
          {action.due_date && (
            <p className="text-[11px] text-muted-foreground mt-0.5">Due {new Date(action.due_date).toLocaleDateString()}</p>
          )}
        </div>
        <button onClick={() => setExpanded(e => !e)} className="shrink-0 p-1 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      {expanded && (
        <div className="border-t border-border p-3 space-y-2 bg-background/40">
          {action.description && <p className="text-xs text-foreground/85">{action.description}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Urgency</label>
            <select
              value={action.urgency}
              onChange={e => onUpdate({ urgency: e.target.value as Action["urgency"] })}
              className="!h-9 !py-1 !min-h-0 max-w-[140px] text-sm"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button
              onClick={() => onUpdate({ status: "deferred" })}
              className="ml-auto text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="h-3 w-3" /> Defer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
