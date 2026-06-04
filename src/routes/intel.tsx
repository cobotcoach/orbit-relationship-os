import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { Pill, EmptyState } from "@/components/ui-bits";
import { Radio } from "lucide-react";

export const Route = createFileRoute("/intel")({
  head: () => ({ meta: [{ title: "ORBIT — Intelligence" }] }),
  component: IntelPage,
});

function IntelPage() {
  const { data: items = [] } = useQuery({ queryKey: ["intel"], queryFn: db.intel.list });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: db.contacts.list });
  const [filterContact, setFilterContact] = useState("");

  const filtered = items.filter(i => !filterContact || i.contact_ids.includes(filterContact));

  return (
    <Shell title="Intelligence Feed" subtitle={`${items.length} items`}>
      <select value={filterContact} onChange={e => setFilterContact(e.target.value)}
        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm mb-4">
        <option value="">All contacts</option>
        {contacts.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
      </select>

      {filtered.length === 0 ? (
        <EmptyState icon={<Radio className="h-7 w-7" />} title="No intelligence yet" hint="Process input in the Inbox tab" />
      ) : (
        <div className="space-y-2">
          {filtered.map(i => (
            <div key={i.id} className="rounded-xl bg-card border border-border p-3">
              <p className="text-sm">{i.summary || i.raw_input.slice(0, 120)}</p>
              <div className="flex gap-1 flex-wrap mt-2">
                {i.urgency && <Pill tone={i.urgency === "critical" || i.urgency === "high" ? "urgent" : "muted"}>{i.urgency}</Pill>}
                {i.sentiment && <Pill tone={i.sentiment === "positive" ? "success" : i.sentiment === "negative" ? "urgent" : "muted"}>{i.sentiment}</Pill>}
                {i.topics.slice(0, 4).map(t => <Pill key={t}>#{t}</Pill>)}
              </div>
              {i.contact_ids.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {i.contact_ids.map(cid => {
                    const c = contacts.find(x => x.id === cid);
                    if (!c) return null;
                    return <Link key={cid} to="/contacts/$id" params={{ id: cid }} className="text-[11px] text-primary">@{c.name}</Link>;
                  })}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">{new Date(i.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
