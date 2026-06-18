import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { Pill, EmptyState } from "@/components/ui-bits";
import { processIdea } from "@/lib/ai.functions";
import { Lightbulb, Plus, Sparkles, X, Loader2, Mic, Square } from "lucide-react";
import { IDEA_MODES, type Idea, type IdeaMode } from "@/lib/types";
import { useMode } from "@/lib/mode-context";
import { toast } from "sonner";

export const Route = createFileRoute("/ideas")({
  head: () => ({ meta: [{ title: "ORBIT — Ideas" }] }),
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

// Web Speech API types (minimal)
type SpeechRecognitionAlt = {
  start: () => void;
  stop: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> & { length: number }; resultIndex: number }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionAlt) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionAlt; webkitSpeechRecognition?: new () => SpeechRecognitionAlt };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function CaptureSheet({ onClose, defaultMode }: { onClose: () => void; defaultMode: IdeaMode | null }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<IdeaMode>(defaultMode ?? "dobot");
  const [recording, setRecording] = useState(false);
  const recRef = useRef<SpeechRecognitionAlt | null>(null);
  const SpeechCtor = getSpeechRecognition();
  const processFn = useServerFn(processIdea);

  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* ignore */ } }, []);

  const toggleRec = () => {
    if (!SpeechCtor) return;
    if (recording) {
      try { recRef.current?.stop(); } catch { /* ignore */ }
      setRecording(false);
      return;
    }
    const rec = new SpeechCtor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-GB";
    let finalBuf = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const transcript = r[0].transcript;
        if (r.isFinal) finalBuf += transcript + " ";
        else interim += transcript;
      }
      setText(prev => {
        // Replace from last marker — simple append: keep base + finalBuf + interim
        const base = (prev.split("⟦live⟧")[0] ?? "").trimEnd();
        return `${base}${base ? " " : ""}${finalBuf}${interim ? "⟦live⟧" + interim : ""}`.replace(/⟦live⟧$/, "");
      });
    };
    rec.onerror = () => { setRecording(false); };
    rec.onend = () => {
      setRecording(false);
      setText(prev => prev.replace(/⟦live⟧.*$/, "").trim());
    };
    recRef.current = rec;
    try { rec.start(); setRecording(true); } catch { setRecording(false); }
  };

  const create = useMutation({
    mutationFn: async () => {
      const cleanText = text.replace(/⟦live⟧.*$/, "").trim();
      const result = await processFn({ data: { text: cleanText, mode } });
      await db.ideas.insert({
        raw_text: cleanText,
        title: result.title,
        summary: result.summary,
        mode: result.mode ?? mode,
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
        <div className="flex gap-1.5 flex-wrap">
          {IDEA_MODES.map(m => (
            <button key={m.value} onClick={() => setMode(m.value)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${mode === m.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}>
              <span>{m.emoji}</span><span>{m.label}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <textarea rows={8} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm pr-12" placeholder="So I was thinking…" value={text} onChange={e => setText(e.target.value)} autoFocus />
          {SpeechCtor && (
            <button
              onClick={toggleRec}
              type="button"
              title={recording ? "Stop recording" : "Start voice capture"}
              className={`absolute bottom-2 right-2 h-10 w-10 rounded-full flex items-center justify-center border ${
                recording
                  ? "bg-red-500 text-white border-red-500 animate-pulse"
                  : "bg-card border-border text-foreground hover:bg-muted"
              }`}
            >
              {recording ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
            </button>
          )}
        </div>
        <button disabled={!text.trim() || create.isPending} onClick={() => create.mutate()} className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2 min-h-[44px]">
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {create.isPending ? "Processing…" : "Capture"}
        </button>
      </div>
    </div>
  );
}

function IdeasPage() {
  const qc = useQueryClient();
  const { activeMode, modeLabel } = useMode();
  const { data: ideas = [] } = useQuery({ queryKey: ["ideas"], queryFn: db.ideas.list });
  const [showCapture, setShowCapture] = useState(false);
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
    ? `${filtered.length} in ${modeLabel}${showAll ? "" : ""}`
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
        <EmptyState icon={<Lightbulb className="h-7 w-7" />} title="No ideas yet" hint={activeMode && !showAll ? `Nothing in ${modeLabel} — switch mode or capture one` : "Tap + to capture a voice note"} />
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

      <button onClick={() => setShowCapture(true)}
        className="fixed bottom-20 md:bottom-6 right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform">
        <Plus className="h-6 w-6" />
      </button>

      {showCapture && <CaptureSheet onClose={() => setShowCapture(false)} defaultMode={activeMode} />}
    </Shell>
  );
}
