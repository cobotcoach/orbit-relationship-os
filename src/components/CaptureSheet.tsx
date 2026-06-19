import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/db";
import { processIdea } from "@/lib/ai.functions";
import { Sparkles, X, Loader2, Mic, Square } from "lucide-react";
import { IDEA_MODES, type IdeaMode } from "@/lib/types";
import { toast } from "sonner";

type RecState = "idle" | "recording" | "transcribing";

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}

function extensionForMime(mimeType: string) {
  const mime = mimeType.split(";")[0];
  if (mime === "audio/mp4") return "mp4";
  if (mime === "audio/mpeg") return "mp3";
  if (mime === "audio/wav") return "wav";
  if (mime === "audio/ogg") return "ogg";
  return "webm";
}

function tidyTranscript(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\b(\w+(?:\s+\w+){0,3})(?:\s+\1\b){2,}/gi, "$1")
    .trim();
}

export function CaptureSheet({ onClose, defaultMode }: { onClose: () => void; defaultMode: IdeaMode | null }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<IdeaMode>(defaultMode ?? "cobot_coach");
  const [recState, setRecState] = useState<RecState>("idle");
  const [elapsed, setElapsed] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const baseTextRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const processFn = useServerFn(processIdea);

  const cleanup = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  };

  useEffect(() => () => {
    try { recorderRef.current?.stop(); } catch { /* ignore */ }
    abortRef.current?.abort();
    cleanup();
  }, []);

  const startRecording = async () => {
    if (recState !== "idle") return;
    const mimeType = pickMimeType();
    if (!mimeType) { toast.error("Recording not supported on this browser"); return; }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      toast.error("Microphone access denied");
      return;
    }

    baseTextRef.current = text.trim();
    chunksRef.current = [];
    streamRef.current = stream;

    const rec = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });
    recorderRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => { void uploadAndTranscribe(rec.mimeType); };
    rec.start();

    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    setRecState("recording");
  };

  const stopRecording = () => {
    if (recState !== "recording") return;
    try { recorderRef.current?.stop(); } catch { /* ignore */ }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecState("transcribing");
  };

  const uploadAndTranscribe = async (mimeType: string) => {
    const blob = new Blob(chunksRef.current, { type: mimeType });
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    if (blob.size < 1024) {
      toast.error("Recording was empty — try again");
      cleanup();
      setRecState("idle");
      return;
    }

    const form = new FormData();
    form.append("file", blob, `recording.${extensionForMime(mimeType)}`);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/transcribe", { method: "POST", body: form, signal: ctrl.signal });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `Transcription failed (${res.status})`);
      }

      const data = await res.json() as { text?: string };
      const transcript = tidyTranscript(data.text ?? "");
      if (!transcript) throw new Error("I couldn't hear anything clear — try again closer to the mic");
      const base = baseTextRef.current;
      setText(base ? `${base} ${transcript}`.trim() : transcript);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error((e as Error).message || "Transcription failed");
      }
    } finally {
      cleanup();
      setRecState("idle");
    }
  };

  const create = useMutation({
    mutationFn: async () => {
      const cleanText = text.trim();
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

  const recordSupported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const mm = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const ss = (elapsed % 60).toString().padStart(2, "0");

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
          <textarea
            rows={8}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm pr-14"
            placeholder={recState === "recording" ? "Listening…" : recState === "transcribing" ? "Transcribing…" : "So I was thinking…"}
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={recState === "transcribing"}
            autoFocus
          />
          {recordSupported && (
            <button
              onClick={recState === "recording" ? stopRecording : startRecording}
              disabled={recState === "transcribing"}
              type="button"
              title={recState === "recording" ? "Stop recording" : "Start voice capture"}
              className={`absolute bottom-2 right-2 h-11 w-11 rounded-full flex items-center justify-center border transition ${
                recState === "recording"
                  ? "bg-red-500 text-white border-red-500 animate-pulse"
                  : recState === "transcribing"
                  ? "bg-muted text-muted-foreground border-border"
                  : "bg-card border-border text-foreground hover:bg-muted active:scale-95"
              }`}
            >
              {recState === "recording" ? <Square className="h-4 w-4" />
                : recState === "transcribing" ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Mic className="h-5 w-5" />}
            </button>
          )}
          {recState === "recording" && (
            <div className="absolute top-2 right-14 inline-flex items-center gap-1.5 rounded-full bg-red-500/15 text-red-400 px-2 py-0.5 text-[11px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              REC {mm}:{ss}
            </div>
          )}
          {recState === "transcribing" && (
            <div className="absolute top-2 right-14 inline-flex items-center gap-1.5 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[11px] font-medium">
              <Loader2 className="h-3 w-3 animate-spin" /> Transcribing
            </div>
          )}
        </div>
        <button
          disabled={!text.trim() || create.isPending || recState !== "idle"}
          onClick={() => create.mutate()}
          className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2 min-h-[44px]"
        >
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {create.isPending ? "Processing…" : "Capture"}
        </button>
      </div>
    </div>
  );
}
