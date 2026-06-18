import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { EmptyState } from "@/components/ui-bits";
import { generateFocus } from "@/lib/ai.functions";
import { Target, Sparkles, Loader2, Check, SkipForward } from "lucide-react";
import type { FocusItem } from "@/lib/types";
import { useMode } from "@/lib/mode-context";
import { toast } from "sonner";


export const Route = createFileRoute("/focus")({
  head: () => ({ meta: [{ title: "ORBIT — Focus" }] }),
  component: FocusPage,
});

function todayISO() { return new Date().toISOString().slice(0, 10); }

function FocusCard({ item, index, onUpdate }: { item: FocusItem; index: number; onUpdate: (patch: Partial<FocusItem>) => void }) {
  const done = item.status === "done";
  const deferred = item.status === "deferred";
  return (
    <div className={`rounded-2xl bg-card border border-border p-5 ${done ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold ${done ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-base font-semibold leading-snug ${done ? "line-through" : ""}`}>{item.title}</p>
          {item.why && <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{item.why}</p>}
          {deferred && <p className="text-[11px] text-amber-400 mt-1.5">Deferred</p>}
        </div>
      </div>
      {!done && !deferred && (
        <div className="flex gap-2 mt-4">
          <button onClick={() => onUpdate({ status: "done" })}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-semibold">
            <Check className="h-4 w-4" /> Done
          </button>
          <button onClick={() => onUpdate({ status: "deferred" })}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-secondary text-secondary-foreground rounded-lg py-2 text-sm font-semibold">
            <SkipForward className="h-4 w-4" /> Defer
          </button>
        </div>
      )}
    </div>
  );
}

function FocusPage() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["focus", "today"], queryFn: db.focus.today });
  const generateFn = useServerFn(generateFocus);

  const regenerate = useMutation({
    mutationFn: async () => {
      const [ideas, actions] = await Promise.all([db.ideas.list(), db.actions.list()]);
      const openActions = actions.filter(a => a.status !== "done").slice(0, 10);
      const recentIdeas = ideas.slice(0, 10);
      const res = await generateFn({
        data: {
          ideas: recentIdeas.map(i => ({ id: i.id, title: i.title, summary: i.summary, category: i.category, energy_score: i.energy_score })),
          actions: openActions.map(a => ({ id: a.id, title: a.title, urgency: a.urgency, contact_id: a.contact_id, due_date: a.due_date })),
        },
      });
      const today = todayISO();
      await db.focus.clearForDate(today);
      for (const it of res.items ?? []) {
        await db.focus.insert({
          title: it.title,
          why: it.why,
          priority: it.priority ?? 2,
          linked_idea_id: it.linked_idea_id ?? null,
          linked_contact_id: it.linked_contact_id ?? null,
          date: today,
          status: "pending",
        });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["focus", "today"] }); toast.success("Focus regenerated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<FocusItem> }) => db.focus.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["focus", "today"] }),
  });

  const sorted = [...items].sort((a, b) => a.priority - b.priority);

  return (
    <Shell
      title="Today's Focus"
      subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
      action={
        <button onClick={() => regenerate.mutate()} disabled={regenerate.isPending}
          className="inline-flex items-center gap-1.5 bg-primary/15 text-primary border border-primary/30 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50">
          {regenerate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Regenerate
        </button>
      }
    >
      {sorted.length === 0 ? (
        <EmptyState icon={<Target className="h-7 w-7" />} title="No focus set for today" hint="Tap Regenerate to let Claude pick your top 3" />
      ) : (
        <div className="space-y-3">
          {sorted.map((item, idx) => (
            <FocusCard key={item.id} item={item} index={idx} onUpdate={(patch) => update.mutate({ id: item.id, patch })} />
          ))}
        </div>
      )}
    </Shell>
  );
}
