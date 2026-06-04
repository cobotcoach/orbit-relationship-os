import { healthColor } from "@/lib/format";

export function HealthBar({ score, showLabel = false }: { score: number; showLabel?: boolean }) {
  const color = healthColor(score);
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(2, Math.min(100, score))}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold tabular-nums" style={{ color }}>{score}</span>
      )}
    </div>
  );
}
