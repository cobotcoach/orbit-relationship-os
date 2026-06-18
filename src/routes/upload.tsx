import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { Upload, FileText, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/upload")({
  component: UploadPage,
});

type QueueItem = {
  id: string;
  file: File;
  status: "queued" | "processing" | "done" | "failed";
  result?: { type: string; mode: string };
  error?: string;
};

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { data: ArrayBuffer }) => { promise: Promise<PdfDoc> };
};
type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage> };
type PdfPage = { getTextContent: () => Promise<{ items: Array<{ str?: string }> }> };

let pdfjsPromise: Promise<PdfJsLib> | null = null;
function loadPdfJs(): Promise<PdfJsLib> {
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = new Promise((resolve, reject) => {
    const w = window as unknown as { pdfjsLib?: PdfJsLib };
    if (w.pdfjsLib) {
      w.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(w.pdfjsLib);
      return;
    }
    const s = document.createElement("script");
    s.src = PDFJS_URL;
    s.onload = () => {
      const lib = (window as unknown as { pdfjsLib?: PdfJsLib }).pdfjsLib;
      if (!lib) return reject(new Error("pdf.js failed to load"));
      lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(lib);
    };
    s.onerror = () => reject(new Error("Failed to load pdf.js"));
    document.head.appendChild(s);
  });
  return pdfjsPromise;
}

async function extractPdfText(file: File): Promise<string> {
  const lib = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const doc = await lib.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map(it => it.str ?? "").join(" "));
  }
  return parts.join("\n\n").trim();
}

function cleanFilename(name: string): string {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/-transcript$/i, "")
    .replace(/-summary$/i, "")
    .trim();
}

function UploadPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<{ total: number; ideas: number; actions: number; intel: number; failed: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    setQueue(q => [
      ...q,
      ...arr.map(f => ({ id: crypto.randomUUID(), file: f, status: "queued" as const })),
    ]);
    setSummary(null);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const processAll = async () => {
    const apiKey = import.meta.env.VITE_INGEST_API_KEY as string | undefined;
    if (!apiKey || apiKey === "your-secret-key-here") {
      alert("VITE_INGEST_API_KEY is not configured.");
      return;
    }
    setRunning(true);
    const pending = queue.filter(q => q.status === "queued");
    setProgress({ done: 0, total: pending.length });
    let ideas = 0, actions = 0, intel = 0, failed = 0;

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      setQueue(q => q.map(x => x.id === item.id ? { ...x, status: "processing" } : x));
      try {
        const text = await extractPdfText(item.file);
        if (!text) throw new Error("No text extracted");
        const title = cleanFilename(item.file.name);
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            transcript: text,
            source: "pdf_upload",
            title,
            original_filename: item.file.name,
            recorded_at: new Date().toISOString(),
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
        const type = json.type as string;
        if (type === "action") actions++;
        else if (type === "intelligence" || type === "note") intel++;
        else ideas++;
        setQueue(q => q.map(x => x.id === item.id ? { ...x, status: "done", result: { type, mode: json.mode } } : x));
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : String(e);
        setQueue(q => q.map(x => x.id === item.id ? { ...x, status: "failed", error: msg } : x));
      }
      setProgress({ done: i + 1, total: pending.length });
      if (i < pending.length - 1) await new Promise(r => setTimeout(r, 1000));
    }

    setRunning(false);
    setSummary({ total: pending.length, ideas, actions, intel, failed });
  };

  const clearDone = () => setQueue(q => q.filter(x => x.status !== "done"));

  return (
    <Shell>
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight inline-flex items-center gap-2">
            <Upload className="h-6 w-6 text-primary" /> Bulk Upload
          </h1>
          <p className="text-sm text-muted-foreground">Drop Plaud PDF transcripts here. Each will be extracted, classified, and routed.</p>
        </header>

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
        >
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="font-medium">Drop your Plaud PDF transcripts here</p>
          <p className="text-xs text-muted-foreground mt-1">or tap to choose files</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={e => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {queue.length > 0 && (
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {queue.length} file{queue.length === 1 ? "" : "s"}
              {progress && running && ` · Processing ${progress.done + 1} of ${progress.total}…`}
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearDone}
                disabled={running}
                className="text-xs px-3 py-1.5 rounded-lg border border-border disabled:opacity-50"
              >Clear done</button>
              <button
                onClick={processAll}
                disabled={running || queue.every(q => q.status !== "queued")}
                className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50 inline-flex items-center gap-2"
              >
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {running ? "Processing…" : "Upload all"}
              </button>
            </div>
          </div>
        )}

        {summary && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="font-semibold">
              {summary.total} processed — {summary.ideas} Ideas, {summary.actions} Actions, {summary.intel} Intel
              {summary.failed > 0 && `, ${summary.failed} failed`}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {queue.map(item => (
            <div key={item.id} className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.file.name}</div>
                {item.result && (
                  <div className="text-xs text-muted-foreground">
                    → {item.result.type} · {item.result.mode}
                  </div>
                )}
                {item.error && <div className="text-xs text-red-500 truncate">{item.error}</div>}
              </div>
              <StatusIcon status={item.status} />
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function StatusIcon({ status }: { status: QueueItem["status"] }) {
  if (status === "queued") return <Clock className="h-5 w-5 text-muted-foreground" />;
  if (status === "processing") return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
  if (status === "done") return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  return <XCircle className="h-5 w-5 text-red-500" />;
}
