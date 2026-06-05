import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { ContactCard } from "@/components/ContactCard";
import { Section, Pill, EmptyState } from "@/components/ui-bits";
import { AlertTriangle, Package, TrendingUp, Radio, Plus, Upload } from "lucide-react";
import { gbp, daysSince } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "ORBIT — Home" }] }),
  component: Home,
});

function Home() {
  const contacts = useQuery({ queryKey: ["contacts"], queryFn: db.contacts.list });
  const loans = useQuery({ queryKey: ["loans"], queryFn: db.loans.list });
  const quotes = useQuery({ queryKey: ["quotes"], queryFn: db.quotes.list });
  const intel = useQuery({ queryKey: ["intel"], queryFn: db.intel.list });

  const priority = (contacts.data ?? []).filter(c => {
    const days = daysSince(c.last_contact_date) ?? 999;
    return c.urgent || days > 14;
  }).slice(0, 5);

  const overdueLoans = (loans.data ?? []).filter(l =>
    l.status === "on_loan" && l.expected_return_date && new Date(l.expected_return_date) < new Date()
  );

  const openPipeline = (quotes.data ?? []).filter(q => !["won", "lost"].includes(q.stage));
  const openValue = openPipeline.reduce((s, q) => s + Number(q.value || 0), 0);

  return (
    <Shell
      title="ORBIT"
      subtitle="Richard · Dobot Robotics UK"
      action={
        <div className="flex items-center gap-2">
          <Link to="/import" className="h-9 px-3 rounded-full bg-secondary text-secondary-foreground inline-flex items-center gap-1.5 text-xs font-medium tap active:scale-95">
            <Upload className="h-3.5 w-3.5" /> Import
          </Link>
          <Link to="/contacts/new" className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center tap active:scale-95">
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      }
    >
      <Section title="Today's priority contacts">
        {priority.length === 0 ? (
          <EmptyState title="All caught up" hint="No urgent or overdue contacts" />
        ) : (
          <div className="space-y-2">{priority.map(c => <ContactCard key={c.id} contact={c} />)}</div>
        )}
      </Section>

      <Section title="Overdue loan equipment">
        {overdueLoans.length === 0 ? (
          <p className="text-xs text-muted-foreground">No overdue loans.</p>
        ) : (
          <div className="space-y-2">
            {overdueLoans.map(l => (
              <div key={l.id} className="rounded-xl bg-card border border-[color:var(--urgent)]/30 p-3 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 mt-0.5" style={{ color: "var(--urgent)" }} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{l.product_name}</p>
                  <p className="text-xs text-muted-foreground">SN {l.serial_number} · due {l.expected_return_date}</p>
                </div>
                <Pill tone="urgent">Overdue</Pill>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Open pipeline">
        <Link to="/pipeline" className="block rounded-xl bg-card border border-border p-4 tap active:scale-[0.99]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold tracking-tight">{gbp(openValue)}</p>
              <p className="text-xs text-muted-foreground">{openPipeline.length} open quotes</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
        </Link>
      </Section>

      <Section title="Recent intelligence" action={<Link to="/intel" className="text-xs text-primary">All →</Link>}>
        {(intel.data ?? []).length === 0 ? (
          <EmptyState icon={<Radio className="h-6 w-6" />} title="No intel yet" hint="Process inputs in the Inbox" />
        ) : (
          <div className="space-y-2">
            {(intel.data ?? []).slice(0, 3).map(i => (
              <div key={i.id} className="rounded-xl bg-card border border-border p-3">
                <p className="text-sm">{i.summary || i.raw_input.slice(0, 90)}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {i.urgency && <Pill tone={i.urgency === "critical" || i.urgency === "high" ? "urgent" : "muted"}>{i.urgency}</Pill>}
                  {i.topics.slice(0, 3).map(t => <Pill key={t}>{t}</Pill>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Quick stats">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <p className="text-xl font-bold">{(contacts.data ?? []).length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Contacts</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <p className="text-xl font-bold">{loans.data?.filter(l => l.status === "on_loan").length ?? 0}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">On loan</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <p className="text-xl font-bold">{(quotes.data ?? []).filter(q => q.stage === "won").length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Won</p>
          </div>
        </div>
      </Section>

      <Section title="Equipment quick add">
        <Package className="h-0 w-0" />
        <Link to="/operations" className="block text-center text-xs text-primary py-2">Go to Operations →</Link>
      </Section>
    </Shell>
  );
}
