import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { Section, Pill, EmptyState } from "@/components/ui-bits";
import { Plus, X, Calendar, Package, LifeBuoy } from "lucide-react";

type Tab = "events" | "loans" | "support";

export const Route = createFileRoute("/operations")({
  head: () => ({ meta: [{ title: "ORBIT — Operations" }] }),
  component: Operations,
});

function Operations() {
  const [tab, setTab] = useState<Tab>("events");
  const [showAdd, setShowAdd] = useState(false);

  return (
    <Shell title="Operations" action={
      <button onClick={() => setShowAdd(true)} className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus className="h-5 w-5" /></button>
    }>
      <div className="grid grid-cols-3 gap-1 mb-4 p-1 bg-card border border-border rounded-xl">
        <TabBtn active={tab === "events"} onClick={() => setTab("events")} icon={<Calendar className="h-4 w-4" />} label="Events" />
        <TabBtn active={tab === "loans"} onClick={() => setTab("loans")} icon={<Package className="h-4 w-4" />} label="Loans" />
        <TabBtn active={tab === "support"} onClick={() => setTab("support")} icon={<LifeBuoy className="h-4 w-4" />} label="Support" />
      </div>

      {tab === "events" && <EventsTab />}
      {tab === "loans" && <LoansTab />}
      {tab === "support" && <SupportTab />}

      {showAdd && <AddSheet tab={tab} onClose={() => setShowAdd(false)} />}
    </Shell>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
      {icon}{label}
    </button>
  );
}

function EventsTab() {
  const { data = [] } = useQuery({ queryKey: ["events"], queryFn: db.events.list });
  if (data.length === 0) return <EmptyState icon={<Calendar className="h-6 w-6" />} title="No events" hint="Tap + to add" />;
  return (
    <div className="space-y-2">
      {data.map(e => (
        <div key={e.id} className="rounded-xl bg-card border border-border p-3">
          <div className="flex justify-between"><p className="font-semibold">{e.name}</p><Pill tone={e.status === "active" ? "success" : "muted"}>{e.status}</Pill></div>
          <p className="text-xs text-muted-foreground mt-1">{e.event_date} · {e.event_type}</p>
          {e.notes && <p className="text-sm mt-2">{e.notes}</p>}
        </div>
      ))}
    </div>
  );
}

function LoansTab() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["loans"], queryFn: db.loans.list });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: db.contacts.list });
  const today = new Date().toISOString().slice(0, 10);
  if (data.length === 0) return <EmptyState icon={<Package className="h-6 w-6" />} title="No loans" hint="Tap + to add" />;
  return (
    <div className="space-y-2">
      {data.map(l => {
        const contact = contacts.find(c => c.id === l.contact_id);
        const overdue = l.status === "on_loan" && l.expected_return_date && l.expected_return_date < today;
        return (
          <div key={l.id} className={`rounded-xl bg-card border p-3 ${overdue ? "border-[color:var(--urgent)]/40" : "border-border"}`}>
            <div className="flex justify-between"><p className="font-semibold">{l.product_name}</p>
              {overdue ? <Pill tone="urgent">Overdue</Pill> : <Pill tone={l.status === "on_loan" ? "warning" : "muted"}>{l.status}</Pill>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">SN {l.serial_number}</p>
            <p className="text-xs text-muted-foreground">To: {contact?.name ?? "—"} · out {l.date_out}{l.expected_return_date ? ` · due ${l.expected_return_date}` : ""}</p>
            {l.status === "on_loan" && (
              <button onClick={async () => { await db.loans.update(l.id, { status: "returned", actual_return_date: today }); qc.invalidateQueries({ queryKey: ["loans"] }); }}
                className="mt-2 text-xs text-primary">Mark returned →</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SupportTab() {
  const { data = [] } = useQuery({ queryKey: ["tickets"], queryFn: db.tickets.list });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: db.contacts.list });
  if (data.length === 0) return <EmptyState icon={<LifeBuoy className="h-6 w-6" />} title="No tickets" hint="Tap + to add" />;
  return (
    <div className="space-y-2">
      {data.map(t => {
        const contact = contacts.find(c => c.id === t.contact_id);
        return (
          <div key={t.id} className="rounded-xl bg-card border border-border p-3">
            <div className="flex justify-between"><p className="font-semibold">{t.ticket_number}</p>
              <div className="flex gap-1"><Pill tone={t.priority === "critical" || t.priority === "high" ? "urgent" : "muted"}>{t.priority}</Pill>
                <Pill tone={t.status === "resolved" ? "success" : "default"}>{t.status}</Pill></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{contact?.name ?? "—"}{t.equipment_serial ? ` · SN ${t.equipment_serial}` : ""}</p>
            <p className="text-sm mt-2">{t.issue}</p>
            {t.assigned_to && <p className="text-xs text-muted-foreground mt-1">Assigned: {t.assigned_to}</p>}
          </div>
        );
      })}
    </div>
  );
}

function AddSheet({ tab, onClose }: { tab: Tab; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: db.contacts.list });
  const i = "w-full bg-input border border-border rounded-lg px-3 py-2 text-sm";

  // shared state
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (tab === "events") {
        await db.events.insert({ name: f.name, event_date: f.event_date, event_type: (f.event_type as never) || "attend", status: "upcoming", notes: f.notes || null });
        qc.invalidateQueries({ queryKey: ["events"] });
      } else if (tab === "loans") {
        await db.loans.insert({ product_name: f.product_name, serial_number: f.serial_number, contact_id: f.contact_id || null, date_out: f.date_out || new Date().toISOString().slice(0,10), expected_return_date: f.expected_return_date || null, status: "on_loan" });
        qc.invalidateQueries({ queryKey: ["loans"] });
      } else {
        await db.tickets.insert({ ticket_number: f.ticket_number, contact_id: f.contact_id || null, equipment_serial: f.equipment_serial || null, issue: f.issue, priority: (f.priority as never) || "medium", status: "open", assigned_to: f.assigned_to || null });
        qc.invalidateQueries({ queryKey: ["tickets"] });
      }
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={onClose}>
      <div className="w-full max-w-xl mx-auto bg-card border-t border-border rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between mb-3"><h2 className="font-semibold capitalize">New {tab === "loans" ? "loan" : tab === "support" ? "ticket" : "event"}</h2><button onClick={onClose}><X className="h-5 w-5" /></button></div>
        <div className="space-y-2.5">
          {tab === "events" && <>
            <input placeholder="Name" onChange={e => set("name", e.target.value)} className={i} />
            <input type="date" onChange={e => set("event_date", e.target.value)} className={i} />
            <select onChange={e => set("event_type", e.target.value)} className={i}>
              {["attend","exhibit","host","sponsor"].map(s => <option key={s}>{s}</option>)}
            </select>
            <textarea placeholder="Notes" rows={2} onChange={e => set("notes", e.target.value)} className={i} />
          </>}
          {tab === "loans" && <>
            <input placeholder="Product name" onChange={e => set("product_name", e.target.value)} className={i} />
            <input placeholder="Serial number" onChange={e => set("serial_number", e.target.value)} className={i} />
            <select onChange={e => set("contact_id", e.target.value)} className={i}>
              <option value="">On loan to…</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
            </select>
            <label className="text-xs text-muted-foreground">Date out</label>
            <input type="date" onChange={e => set("date_out", e.target.value)} className={i} />
            <label className="text-xs text-muted-foreground">Expected return</label>
            <input type="date" onChange={e => set("expected_return_date", e.target.value)} className={i} />
          </>}
          {tab === "support" && <>
            <input placeholder="Ticket number" onChange={e => set("ticket_number", e.target.value)} className={i} />
            <select onChange={e => set("contact_id", e.target.value)} className={i}>
              <option value="">Contact…</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
            </select>
            <input placeholder="Equipment serial (optional)" onChange={e => set("equipment_serial", e.target.value)} className={i} />
            <textarea placeholder="Issue description" rows={3} onChange={e => set("issue", e.target.value)} className={i} />
            <select onChange={e => set("priority", e.target.value)} className={i}>
              {["low","medium","high","critical"].map(s => <option key={s}>{s}</option>)}
            </select>
            <input placeholder="Assigned to" onChange={e => set("assigned_to", e.target.value)} className={i} />
          </>}
          <button onClick={() => save.mutate()} disabled={save.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
