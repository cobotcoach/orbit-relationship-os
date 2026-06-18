import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { Pill, EmptyState } from "@/components/ui-bits";
import { processIdea } from "@/lib/ai.functions";
import { Lightbulb, Plus, Sparkles, X, Loader2 } from "lucide-react";
import { IDEA_CATEGORIES, type Idea, type IdeaCategory } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/ideas")({
  head: () => ({ meta: [{ title: "ORBIT — Ideas" }] }),
  component: IdeasPage,
});

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(IDEA_CATEGORIES.map(c => [c.value, c.label]));

function EnergyBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(10, score)) * 10;
  const tone = score >= 8 ? "bg-primary" : score >= 5 ? "bg-amber-500" : "bg-muted-foreground/60";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground w-5 text-right">{score}</span>
    </div>
  );
}

function statusTone(s: string): "default" | "urgent" | "warning" | "success" | "muted" {
  if (s === "active") return "success";
  if (s === "new") return "warning";
  if (s === "parked") return "muted";
  if (s === "done") return "default";
  return "default";
}

function IdeaCard({ idea, onUpdate }: { idea: Idea; onUpdate: (patch: Partial<Idea>) => void }) {
  return (
    <div className="rounded-xl bg-card border border-border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug">{idea.title ?? "Untitled"}</p>
        <select
          value={idea.status}
          onChange={(e) => onUpdate({ status: e.target.value })}
          className="text-[10px] bg-background border border-border rounded px-1 py-0.5"
        >
          {["new", "reviewing", "active", "parked", "done"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {idea.summary && <p className="text-xs text-muted-foreground line-clamp-3">{idea.summary}</p>}
      <EnergyBar score={idea.energy_score} />
      <div className="flex items-center gap-1.5 flex-wrap">
        <Pill tone="success">{CATEGORY_LABEL[idea.category] ?? idea.category}</Pill>
        <Pill tone={statusTone(idea.status)}>{idea.status}</Pill>
        {idea.tags.slice(0, 3).map(t => <Pill key={t} tone="muted">{t}</Pill>)}
      </div>
    </div>
  );
}

function CaptureSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const processFn = useServerFn(processIdea);
  const create = useMutation({
    mutationFn: async () => {
      const result = await processFn({ data: { text } });
      await db.ideas.insert({
        raw_text: text,
        title: result.title,
        summary: result.summary,
        category: result.category,
        energy_score: result.energy_score,
        tags: result.tags,
        source: "voice_note",
        status: "new",
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ideas"] }); toast.success("Idea captured"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-xl bg-card border border-border rounded-t-2xl sm:rounded-2xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Capture idea</h2>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-xs text-muted-foreground">Paste a raw voice-note transcript. Claude will extract title, summary, category, energy and tags.</p>
        <textarea rows={10} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" placeholder="So I was thinking…" value={text} onChange={e => setText(e.target.value)} autoFocus />
        <button disabled={!text.trim() || create.isPending} onClick={() => create.mutate()} className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {create.isPending ? "Processing…" : "Capture"}
        </button>
      </div>
    </div>
  );
}

function IdeasPage() {
  const qc = useQueryClient();
  const { data: ideas = [] } = useQuery({ queryKey: ["ideas"], queryFn: db.ideas.list });
  const [showCapture, setShowCapture] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, Idea[]>();
    for (const i of ideas) {
      const key = i.category ?? "other";
      const arr = map.get(key) ?? [];
      arr.push(i);
      map.set(key, arr);
    }
    // Sort each group by energy desc
    for (const arr of map.values()) arr.sort((a, b) => b.energy_score - a.energy_score);
    return map;
  }, [ideas]);

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Idea> }) => db.ideas.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ideas"] }),
  });

  const orderedCategories = IDEA_CATEGORIES.map(c => c.value as IdeaCategory).filter(c => grouped.has(c));

  return (
    <Shell title="Ideas" subtitle={`${ideas.length} captured`}>
      {ideas.length === 0 ? (
        <EmptyState icon={<Lightbulb className="h-7 w-7" />} title="No ideas yet" hint="Tap + to capture a voice note" />
      ) : (
        <div className="space-y-5">
          {orderedCategories.map(cat => (
            <div key={cat}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {CATEGORY_LABEL[cat]} <span className="opacity-60">({grouped.get(cat)!.length})</span>
              </h2>
              <div className="space-y-2">
                {grouped.get(cat)!.map(i => (
                  <IdeaCard key={i.id} idea={i} onUpdate={(patch) => update.mutate({ id: i.id, patch })} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setShowCapture(true)}
        className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform">
        <Plus className="h-6 w-6" />
      </button>

      {showCapture && <CaptureSheet onClose={() => setShowCapture(false)} />}
    </Shell>
  );
}
