import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/db";
import { processIdea } from "@/lib/ai.functions";
import { Sparkles, X, Loader2, Mic, Square } from "lucide-react";
import { IDEA_MODES, type IdeaMode } from "@/lib/types";
import { toast } from "sonner";

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

export function CaptureSheet({ onClose, defaultMode }: { onClose: () => void; defaultMode: IdeaMode | null }) {
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
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur flex items-end sm:items-center justify-center" onClick={onClose}>
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
