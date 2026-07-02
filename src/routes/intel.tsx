import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { Pill, EmptyState } from "@/components/ui-bits";
import { Radio, Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/intel")({
  head: () => ({ meta: [{ title: "Mawson — Intel" }] }),
  component: IntelPage,
});

const SOURCE_BADGE: Record<string, string> = {
  plaud: "🎙 Plaud",
  pdf_upload: "📄 PDF",
  voice: "🎤 Voice",
  voice_note: "🎤 Voice",
  manual: "✍️ Manual",
  zapier: "⚡ Zapier",
};

type Filter = "all" | "plaud" | "manual";

function IntelPage() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["intel"], queryFn: db.intel.list });
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const add = useMutation({
    mutationFn: async (text: string) => db.intel.insert({
      source: "manual",
      raw_input: text,
      summary: text.slice(0, 200),
      topics: [],
      urgency: "medium",
      contact_ids: [],
      extracted: {},
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intel"] });
      setDraft(""); setAddOpen(false);
      toast.success("Intel added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = items.filter(i => {
    if (filter === "all") return true;
    if (filter === "plaud") return i.source === "plaud";
    if (filter === "manual") return i.source === "manual";
    return true;
  });

  return (
    <Shell
      title="Intel"
      subtitle={`${items.length} signal${items.length === 1 ? "" : "s"}`}
      action={
        <button
          onClick={() => setAddOpen(true)}
          className="h-10 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add intel
        </button>
      }
    >
      <div className="flex gap-2 mb-4">
        {(["all", "plaud", "manual"] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold min-h-[36px]"
            style={{
              background: filter === f ? "var(--primary)" : "var(--surface-2)",
              color: filter === f ? "var(--primary-fg)" : "var(--muted-fg)",
              border: "1px solid var(--border)",
            }}
          >
            {f === "all" ? "All" : f === "plaud" ? "🎙 Plaud" : "✍️ Manual"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Radio className="h-7 w-7" />} title="No intel yet" hint="Tap Add intel or capture via the + button" />
      ) : (
        <div className="space-y-2">
          {filtered.map(i => {
            const isOpen = expandedId === i.id;
            const summary = i.summary || i.raw_input.slice(0, 120);
            const urgTone: "urgent" | "warning" | "muted" =
              i.urgency === "critical" || i.urgency === "high" ? "urgent"
              : i.urgency === "medium" ? "warning"
              : "muted";
            return (
              <button
                key={i.id}
                onClick={() => setExpandedId(isOpen ? null : i.id)}
                className="w-full text-left rounded-xl bg-card border border-border p-3 tap"
              >
                <div className="flex items-center gap-2 mb-1.5 text-[11px]">
                  <span className="font-medium">{SOURCE_BADGE[i.source] ?? i.source}</span>
                  <Pill tone={urgTone}>{i.urgency ?? "—"}</Pill>
                  <span className="ml-auto text-muted-foreground">{new Date(i.created_at).toLocaleString()}</span>
                </div>
                <p className={`text-sm text-foreground/90 ${isOpen ? "" : "line-clamp-2"}`}>
                  {isOpen ? i.raw_input : summary}
                </p>
                {isOpen && i.summary && i.summary !== i.raw_input && (
                  <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2"><strong>Summary:</strong> {i.summary}</p>
                )}
                {i.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {i.topics.slice(0, 6).map(t => <Pill key={t} tone="muted">#{t}</Pill>)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-[70] bg-background/80 backdrop-blur-md flex items-end md:items-center justify-center p-3" onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Add intel</h3>
              <button onClick={() => setAddOpen(false)} className="p-2 text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={6}
              placeholder="Paste signal — meeting note, market intel, competitor move…"
              autoFocus
            />
            <button
              onClick={() => add.mutate(draft.trim())}
              disabled={!draft.trim() || add.isPending}
              className="w-full mt-3 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
            >
              {add.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}
