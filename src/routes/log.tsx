import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, RefreshCw, Check } from "lucide-react";
import { Shell } from "@/components/Shell";
import { db } from "@/lib/db";
import { reclassifyIdea } from "@/lib/ingest.functions";
import type { CaptureLogEntry } from "@/lib/types";

export const Route = createFileRoute("/log")({
  component: LogPage,
});

const SOURCE_BADGE: Record<string, string> = {
  plaud: "🎙 Plaud",
  pdf_upload: "📄 PDF",
  voice: "🎤 Voice",
  voice_note: "🎤 Voice",
  manual: "✍️ Manual",
  zapier: "⚡ Zapier",
};

const ROUTED_BADGE: Record<string, string> = {
  ideas: "💡 Idea",
  actions: "⚡ Action",
  intelligence_items: "📡 Intel",
};

function LogPage() {
  const { data: rows = [] } = useQuery({
    queryKey: ["captures_log"],
    queryFn: () => db.log.list(),
    refetchInterval: 30000,
  });

  return (
    <Shell title="Capture Log" subtitle="Audit trail of every capture entering Mawson. Refreshes every 30s.">
      <div className="max-w-3xl mx-auto space-y-2">
        {rows.length === 0 && <div className="text-sm text-muted-foreground p-6 text-center">No captures yet.</div>}
        {rows.map(r => <LogRow key={r.id} row={r} />)}
      </div>
    </Shell>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "done" ? "bg-green-500" : status === "failed" ? "bg-red-500" : "bg-amber-500";
  return <span className={`h-2 w-2 rounded-full ${color} shrink-0`} aria-label={status} />;
}

function LogRow({ row }: { row: CaptureLogEntry }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const qc = useQueryClient();
  const retag = useServerFn(reclassifyIdea);
  const preview = row.raw_text.slice(0, 80);
  const canRetag = row.status === "done" && row.routed_to === "ideas" && row.routed_id;

  const handleRetag = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canRetag || state === "loading") return;
    setState("loading");
    setErrMsg(null);
    try {
      const res = await retag({ data: { id: row.routed_id! } });
      if (res.ok) {
        setState("done");
        await qc.invalidateQueries({ queryKey: ["ideas"] });
        setTimeout(() => setState("idle"), 1800);
      } else {
        setState("error");
        setErrMsg(res.error ?? "Failed");
        setTimeout(() => setState("idle"), 3000);
      }
    } catch (err) {
      setState("error");
      setErrMsg(err instanceof Error ? err.message : "Failed");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full p-3 flex items-start gap-3 text-left"
      >
        {open ? <ChevronDown className="h-4 w-4 mt-1 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-medium">{SOURCE_BADGE[row.source] ?? row.source}</span>
            {row.mode && <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{row.mode}</span>}
            {row.routed_to && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">{ROUTED_BADGE[row.routed_to] ?? row.routed_to}</span>}
            <span className="text-muted-foreground ml-auto">{new Date(row.created_at).toLocaleString()}</span>
          </div>
          {row.original_filename && <div className="text-xs text-muted-foreground truncate">{row.original_filename}</div>}
          <div className="text-sm truncate">{preview}{row.raw_text.length > 80 ? "…" : ""}</div>
          {row.error_text && <div className="text-xs text-red-500 truncate">{row.error_text}</div>}
          {errMsg && <div className="text-xs text-red-500 truncate">{errMsg}</div>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canRetag && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleRetag}
              onKeyDown={(e) => { if (e.key === "Enter") handleRetag(e as unknown as React.MouseEvent); }}
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border transition-colors ${
                state === "done"
                  ? "border-green-500/40 bg-green-500/10 text-green-600"
                  : state === "error"
                  ? "border-red-500/40 bg-red-500/10 text-red-600"
                  : "border-border hover:bg-muted"
              }`}
              title="Re-classify with the latest prompt"
            >
              {state === "loading" ? <Loader2 className="h-3 w-3 animate-spin" />
                : state === "done" ? <Check className="h-3 w-3" />
                : <RefreshCw className="h-3 w-3" />}
              {state === "done" ? "Updated" : state === "loading" ? "Re-tagging" : "Re-tag"}
            </span>
          )}
          <StatusDot status={row.status} />
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 pl-10">
          <pre className="text-xs whitespace-pre-wrap bg-muted/40 rounded p-3 max-h-96 overflow-auto">{row.raw_text}</pre>
        </div>
      )}
    </div>
  );
}
