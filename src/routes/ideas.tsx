import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { Pill, EmptyState } from "@/components/ui-bits";
import { Lightbulb } from "lucide-react";
import { IDEA_MODES, type Idea } from "@/lib/types";
import { useMode } from "@/lib/mode-context";

export const Route = createFileRoute("/ideas")({
  head: () => ({ meta: [{ title: "Mawson — Ideas" }] }),
  component: IdeasPage,
});

const MODE_LABEL: Record<string, string> = Object.fromEntries(IDEA_MODES.map(m => [m.value, m.label]));
const MODE_EMOJI: Record<string, string> = Object.fromEntries(IDEA_MODES.map(m => [m.value, m.emoji]));

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
        <Pill tone="success">{MODE_EMOJI[idea.mode] ?? ""} {MODE_LABEL[idea.mode] ?? idea.mode}</Pill>
        <Pill tone={statusTone(idea.status)}>{idea.status}</Pill>
        {idea.tags.slice(0, 3).map(t => <Pill key={t} tone="muted">{t}</Pill>)}
      </div>
    </div>
  );
}

function IdeasPage() {
  const qc = useQueryClient();
  const { activeMode, modeLabel, openCapture } = useMode();
  const { data: ideas = [] } = useQuery({ queryKey: ["ideas"], queryFn: db.ideas.list });
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    if (!activeMode || showAll) return ideas;
    return ideas.filter(i => i.mode === activeMode);
  }, [ideas, activeMode, showAll]);

  const grouped = useMemo(() => {
    const map = new Map<string, Idea[]>();
    for (const i of filtered) {
      const key = i.mode ?? "wild";
      const arr = map.get(key) ?? [];
      arr.push(i);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => b.energy_score - a.energy_score);
    return map;
  }, [filtered]);

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Idea> }) => db.ideas.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ideas"] }),
  });

  const orderedModes = IDEA_MODES.map(m => m.value).filter(m => grouped.has(m));
  const subtitle = activeMode
    ? `${filtered.length} in ${modeLabel}`
    : `${ideas.length} captured`;

  return (
    <Shell
      title="Ideas"
      subtitle={subtitle}
      action={activeMode ? (
        <button onClick={() => setShowAll(s => !s)}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
          {showAll ? "Filter by mode" : "All modes"}
        </button>
      ) : undefined}
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="h-7 w-7" />}
          title="No ideas yet"
          hint={activeMode && !showAll ? `Nothing in ${modeLabel} — tap + to capture` : "Tap + in the nav to capture a voice note"}
        />
      ) : (
        <div className="space-y-5">
          {orderedModes.map(cat => (
            <div key={cat}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {MODE_EMOJI[cat]} {MODE_LABEL[cat]} <span className="opacity-60">({grouped.get(cat)!.length})</span>
              </h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                {grouped.get(cat)!.map(i => (
                  <IdeaCard key={i.id} idea={i} onUpdate={(patch) => update.mutate({ id: i.id, patch })} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop capture FAB (mobile uses BottomNav centre button) */}
      <button
        onClick={openCapture}
        className="hidden md:flex fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg items-center justify-center active:scale-95 transition-transform"
        aria-label="Capture idea"
      >
        <Lightbulb className="h-6 w-6" />
      </button>
    </Shell>
  );
}
