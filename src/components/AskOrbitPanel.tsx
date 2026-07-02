import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Send, Loader2, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { missionControlAsk } from "@/lib/ai.functions";
import { Markdown } from "@/components/ui-bits";
import type { BusinessSection, Idea, IntelligenceItem, Action, SmartTopic } from "@/lib/types";
import { toast } from "sonner";

const QUICK_CHIPS = [
  "What should I do right now?",
  "What's blocking launch?",
  "Write outreach for Jamie Ross",
  "Prioritise my week",
  "I just finished something",
];

interface Props {
  open: boolean;
  onClose: () => void;
  sections: BusinessSection[];
  ideas: Idea[];
  intel: IntelligenceItem[];
  actions: Action[];
  topics: SmartTopic[];
}

export function AskOrbitPanel({ open, onClose, sections, ideas, intel, actions, topics }: Props) {
  const qc = useQueryClient();
  const askFn = useServerFn(missionControlAsk);
  const chats = useQuery({
    queryKey: ["mission_chats"],
    queryFn: () => db.missionChats.list(10),
    enabled: open,
  });
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chats.data?.length, pending]);

  if (!open) return null;

  const openActions = actions.filter(a => a.status !== "done");
  const recentIdeas = ideas.slice(0, 30);
  const recentIntel = intel.slice(0, 20);
  const openTopics = topics.filter(t => t.status !== "resolved");

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setInput("");
    setPending(true);
    // Optimistic append
    qc.setQueryData<typeof chats.data>(["mission_chats"], (prev) => [
      ...(prev ?? []),
      { id: `tmp-${Date.now()}`, question: trimmed, answer: "", created_at: new Date().toISOString() },
    ]);
    try {
      const res = await askFn({
        data: {
          question: trimmed,
          sections: sections.map(s => ({
            title: s.title, slug: s.slug, status: s.status,
            confidence: s.confidence_score ?? 5,
            ownerSummary: s.owner_summary, nextAction: s.next_action,
            aiSynthesis: s.ai_synthesis, blockers: s.blockers ?? [],
          })),
          recentIdeas: recentIdeas.map(i => ({ title: i.title, summary: i.summary, tags: i.tags, mode: i.mode })),
          recentIntel: recentIntel.map(i => ({ summary: i.summary, topics: i.topics })),
          openActions: openActions.slice(0, 30).map(a => ({ title: a.title, urgency: a.urgency })),
          openTopics: openTopics.slice(0, 20).map(t => ({ title: t.title, status: t.status, next: t.next_action })),
        },
      });
      await db.missionChats.insert(trimmed, res.answer);
      await qc.invalidateQueries({ queryKey: ["mission_chats"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ask Mawson failed");
      // remove optimistic
      qc.setQueryData<typeof chats.data>(["mission_chats"], (prev) => (prev ?? []).filter(c => !c.id.startsWith("tmp-")));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-md flex md:items-stretch md:justify-end" onClick={onClose}>
      <div
        className="w-full h-full md:max-w-xl bg-surface-1 md:border-l border-border flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between glass" style={{ paddingTop: "max(0.75rem,env(safe-area-inset-top))" }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-base leading-tight">Ask Mawson</h2>
              <p className="text-[11px] text-muted-foreground truncate">
                Knows: {sections.length} sections · {ideas.length} ideas · {openActions.length} open · {intel.length} intel
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-surface-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conversation */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {(!chats.data || chats.data.length === 0) && !pending && (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-7 w-7 mx-auto mb-3 text-primary" />
              <p className="text-sm font-semibold text-foreground">Your AI team member.</p>
              <p className="text-xs mt-1">Ask anything. Tap a chip below to start.</p>
            </div>
          )}
          {chats.data?.map(c => (
            <div key={c.id} className="space-y-3">
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 bg-primary text-primary-foreground text-sm">
                  {c.question}
                </div>
              </div>
              {c.answer ? (
                <div className="text-sm">
                  <Markdown>{c.answer}</Markdown>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick chips */}
        <div className="px-3 pt-2 pb-1 border-t border-border overflow-x-auto no-scrollbar">
          <div className="flex gap-2">
            {QUICK_CHIPS.map(c => (
              <button
                key={c}
                onClick={() => send(c)}
                disabled={pending}
                className="shrink-0 px-3 py-1.5 rounded-full bg-surface-2 border border-border text-[12px] text-foreground/90 hover:border-primary/40 disabled:opacity-50 min-h-[36px]"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="p-3 border-t border-border flex gap-2 items-end"
          style={{ paddingBottom: "max(0.75rem, calc(env(safe-area-inset-bottom) + 0.5rem))" }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            rows={1}
            placeholder="Ask Mawson anything…"
            className="flex-1 resize-none max-h-32"
          />
          <button
            type="submit"
            disabled={!input.trim() || pending}
            aria-label="Send"
            className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
