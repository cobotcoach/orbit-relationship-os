import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { Section, Pill, EmptyState } from "@/components/ui-bits";
import { Plus, X } from "lucide-react";
import { gbp } from "@/lib/format";

const STAGES = ["prospect", "quoted", "negotiating", "won", "lost"] as const;
const CHANNELS = ["all", "direct", "partner", "distributor"] as const;

export const Route = createFileRoute("/pipeline")({
  head: () => ({ meta: [{ title: "ORBIT — Pipeline" }] }),
  component: Pipeline,
});

function Pipeline() {
  const qc = useQueryClient();
  const { data: quotes = [] } = useQuery({ queryKey: ["quotes"], queryFn: db.quotes.list });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: db.contacts.list });
  const [channelFilter, setChannelFilter] = useState<typeof CHANNELS[number]>("all");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = quotes.filter(q => channelFilter === "all" || q.channel === channelFilter);

  const totals: Record<string, number> = {};
  STAGES.forEach(s => { totals[s] = filtered.filter(q => q.stage === s).reduce((a, q) => a + Number(q.value || 0), 0); });

  return (
    <Shell title="Pipeline" action={
      <button onClick={() => setShowAdd(true)} className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus className="h-5 w-5" /></button>
    }>
      <div className="-mx-4 px-4 overflow-x-auto no-scrollbar mb-3">
        <div className="flex gap-2 pb-1">
          {CHANNELS.map(c => (
            <button key={c} onClick={() => setChannelFilter(c)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium tap ${channelFilter === c ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <Section title="By stage">
        <div className="grid grid-cols-2 gap-2">
          {STAGES.map(s => (
            <div key={s} className="rounded-xl bg-card border border-border p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s}</p>
              <p className="text-lg font-bold mt-0.5">{gbp(totals[s])}</p>
              <p className="text-[10px] text-muted-foreground">{filtered.filter(q => q.stage === s).length} quotes</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`${filtered.length} quote${filtered.length === 1 ? "" : "s"}`}>
        {filtered.length === 0 ? <EmptyState title="No quotes yet" hint="Tap + to add one" /> : (
          <div className="space-y-2">
            {filtered.map(q => {
              const contact = contacts.find(c => c.id === q.contact_id);
              return (
                <div key={q.id} className="rounded-xl bg-card border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{q.quote_ref}</p>
                      <p className="text-xs text-muted-foreground truncate">{contact?.name ?? q.company ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{gbp(Number(q.value))}</p>
                      <Pill tone={q.stage === "won" ? "success" : q.stage === "lost" ? "muted" : "default"}>{q.stage}</Pill>
                    </div>
                  </div>
                  {q.products && <p className="text-xs text-foreground/80 mt-2">{q.products}</p>}
                  <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                    <span>{q.channel}</span>
                    <span>{q.quote_date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {showAdd && <AddQuoteSheet onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); qc.invalidateQueries({ queryKey: ["quotes"] }); }} />}
    </Shell>
  );
}

function AddQuoteSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: db.contacts.list });
  const [ref, setRef] = useState(""); const [contactId, setContactId] = useState<string>("");
  const [products, setProducts] = useState(""); const [value, setValue] = useState("");
  const [stage, setStage] = useState<typeof STAGES[number]>("quoted");
  const [channel, setChannel] = useState<"direct"|"partner"|"distributor">("direct");

  const save = useMutation({
    mutationFn: async () => db.quotes.insert({
      quote_ref: ref, contact_id: contactId || null, products, value: Number(value || 0), stage, channel,
      company: contacts.find(c => c.id === contactId)?.company ?? null,
    }),
    onSuccess: onSaved,
  });

  const i = "w-full bg-input border border-border rounded-lg px-3 py-2 text-sm";
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={onClose}>
      <div className="w-full max-w-xl mx-auto bg-card border-t border-border rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between mb-3"><h2 className="font-semibold">New quote</h2><button onClick={onClose}><X className="h-5 w-5" /></button></div>
        <div className="space-y-2.5">
          <input value={ref} onChange={e => setRef(e.target.value)} placeholder="Quote ref" className={i} />
          <select value={contactId} onChange={e => setContactId(e.target.value)} className={i}>
            <option value="">Select contact…</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
          </select>
          <input value={products} onChange={e => setProducts(e.target.value)} placeholder="Products" className={i} />
          <input value={value} onChange={e => setValue(e.target.value)} type="number" placeholder="Value (GBP)" className={i} />
          <select value={stage} onChange={e => setStage(e.target.value as never)} className={i}>{STAGES.map(s => <option key={s}>{s}</option>)}</select>
          <select value={channel} onChange={e => setChannel(e.target.value as never)} className={i}>
            <option value="direct">direct</option><option value="partner">partner</option><option value="distributor">distributor</option>
          </select>
          <button onClick={() => save.mutate()} disabled={!ref || save.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
            {save.isPending ? "Saving…" : "Save quote"}
          </button>
        </div>
      </div>
    </div>
  );
}
