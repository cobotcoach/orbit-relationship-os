import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { Section, Pill, Markdown } from "@/components/ui-bits";
import { Sparkles, Loader2, Plus, Check, Paperclip } from "lucide-react";
import { processInbox } from "@/lib/ai.functions";

export const Route = createFileRoute("/inbox")({
  head: () => ({ meta: [{ title: "ORBIT — Inbox" }] }),
  component: InboxPage,
});

type Result = Awaited<ReturnType<typeof processInbox>>;

function InboxPage() {
  const qc = useQueryClient();
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: db.contacts.list });
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const proc = useServerFn(processInbox);
  const procM = useMutation({
    mutationFn: async () => {
      const r = await proc({ data: { text, existingContacts: contacts.map(c => ({ id: c.id, name: c.name, company: c.company })) } });
      // Save to intel feed
      await db.intel.insert({
        source: "inbox", raw_input: text, summary: r.summary, topics: r.topics,
        sentiment: r.sentiment, urgency: r.urgency, contact_ids: r.matched_contact_ids,
        extracted: r as never,
      });
      qc.invalidateQueries({ queryKey: ["intel"] });
      return r;
    },
    onSuccess: (r) => setResult(r),
  });

  const applyM = useMutation({
    mutationFn: async () => {
      if (!result) return;
      // Add activities to matched contacts
      for (const cid of result.matched_contact_ids) {
        await db.activities.insert({ contact_id: cid, kind: "intelligence", summary: result.summary, details: text, sentiment: result.sentiment });
        await db.contacts.update(cid, { last_contact_date: new Date().toISOString() });
      }
      // Create actions (attach to first matched contact if any)
      const firstContact = result.matched_contact_ids[0] ?? null;
      for (const a of result.actions) {
        await db.actions.insert({ title: a.title, urgency: a.urgency as never, contact_id: firstContact });
      }
      // Create new contacts
      for (const nc of result.new_contacts) {
        await db.contacts.insert({
          name: nc.name, company: nc.company,
          type: (nc.suggested_type as never) || "prospect",
          folder: nc.suggested_folder || "warm",
          notes: nc.rationale, health_score: 50,
        });
      }
      qc.invalidateQueries();
      setText(""); setResult(null); setAddedIds(new Set());
    },
  });

  return (
    <Shell title="Inbox Processor" subtitle="Paste email, transcript, or comms">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={8}
        placeholder="Paste anything — an email thread, a Plaud transcript, an internal Slack message…"
        className="w-full bg-card border border-border rounded-xl p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary"
      />
      <button
        onClick={() => procM.mutate()}
        disabled={!text || procM.isPending}
        className="w-full mt-3 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
      >
        {procM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Process with AI
      </button>

      {result && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl bg-card border border-primary/40 p-3">
            <p className="text-sm font-medium">{result.summary}</p>
            <div className="flex gap-1 flex-wrap mt-2">
              <Pill tone={result.urgency === "critical" || result.urgency === "high" ? "urgent" : "muted"}>{result.urgency}</Pill>
              <Pill tone={result.sentiment === "positive" ? "success" : result.sentiment === "negative" ? "urgent" : "muted"}>{result.sentiment}</Pill>
              {result.topics.map(t => <Pill key={t}>#{t}</Pill>)}
            </div>
          </div>

          <Section title="Matched contacts">
            {result.matched_contact_ids.length === 0 ? <p className="text-xs text-muted-foreground">None.</p> : (
              <div className="space-y-1.5">
                {result.matched_contact_ids.map(cid => {
                  const c = contacts.find(x => x.id === cid);
                  if (!c) return null;
                  return <Link key={cid} to="/contacts/$id" params={{ id: cid }} className="block p-2 rounded-lg bg-card border border-border">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.company}</p>
                  </Link>;
                })}
              </div>
            )}
          </Section>

          <Section title={`New contacts (${result.new_contacts.length})`}>
            {result.new_contacts.length === 0 ? <p className="text-xs text-muted-foreground">None suggested.</p> : (
              <div className="space-y-1.5">
                {result.new_contacts.map((nc, i) => (
                  <div key={i} className="p-2 rounded-lg bg-card border border-border">
                    <p className="text-sm font-medium">{nc.name}</p>
                    <p className="text-xs text-muted-foreground">{nc.company} · {nc.suggested_type} / {nc.suggested_folder}</p>
                    <p className="text-[11px] text-primary mt-1">{nc.rationale}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Actions (${result.actions.length})`}>
            {result.actions.length === 0 ? <p className="text-xs text-muted-foreground">None.</p> : (
              <div className="space-y-1.5">
                {result.actions.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
                    <Plus className="h-4 w-4 text-primary" />
                    <span className="text-sm flex-1">{a.title}</span>
                    <Pill tone={a.urgency === "critical" || a.urgency === "high" ? "urgent" : "muted"}>{a.urgency}</Pill>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <button onClick={() => applyM.mutate()} disabled={applyM.isPending}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
            {applyM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Apply to timelines & tasks
          </button>
        </div>
      )}

      {/* hide unused */}
      <span className="hidden">{addedIds.size}</span>
    </Shell>
  );
}
