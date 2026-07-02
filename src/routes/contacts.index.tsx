import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { Pill, EmptyState } from "@/components/ui-bits";
import { CONTACT_TYPES, FOLDERS_BY_TYPE, ContactType } from "@/lib/types";
import { Plus, Search, Users, ChevronRight, AlertCircle, Send } from "lucide-react";
import { lastContactLabel } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/contacts/")({
  head: () => ({ meta: [{ title: "Mawson — Partners" }] }),
  component: PartnersPage,
});

function PartnersPage() {
  const qc = useQueryClient();
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: db.contacts.list });
  const [activeType, setActiveType] = useState<ContactType>("partner");
  const [search, setSearch] = useState("");

  const followUp = useMutation({
    mutationFn: async (c: { id: string; name: string }) => {
      await db.actions.insert({
        contact_id: c.id,
        title: `Follow up with ${c.name}`,
        urgency: "medium",
        status: "open",
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["actions"] }); toast.success("Follow-up added to Today's Actions"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = contacts
    .filter(c => c.type === activeType)
    .filter(c => !search || `${c.name} ${c.company ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  const folderOrder = FOLDERS_BY_TYPE[activeType].map(f => f.value);
  const grouped = folderOrder.map(f => ({
    folder: f,
    label: FOLDERS_BY_TYPE[activeType].find(x => x.value === f)?.label ?? f,
    items: filtered.filter(c => c.folder === f),
  }));
  // bucket unknown folders
  const orphans = filtered.filter(c => !folderOrder.includes(c.folder));
  if (orphans.length) grouped.push({ folder: "_other", label: "Other", items: orphans });

  return (
    <Shell
      title="Partners"
      subtitle="Founding partner pipeline"
      action={
        <Link to="/contacts/new" className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center tap active:scale-95">
          <Plus className="h-5 w-5" />
        </Link>
      }
    >
      {/* Type tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar -mx-1 px-1">
        {CONTACT_TYPES.map(t => {
          const count = contacts.filter(c => c.type === t.value).length;
          const active = activeType === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setActiveType(t.value)}
              className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors min-h-[40px]"
              style={{
                background: active ? "var(--primary)" : "var(--surface-2)",
                color: active ? "var(--primary-fg)" : "var(--muted-fg)",
                border: "1px solid var(--border)",
              }}
            >
              {t.label} <span className="opacity-70 ml-1">{count}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mb-3">{CONTACT_TYPES.find(t => t.value === activeType)?.description}</p>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or company"
          className="!pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title={`No ${CONTACT_TYPES.find(t => t.value === activeType)?.label.toLowerCase()} yet`}
          hint="Tap + to add one"
        />
      ) : (
        <div className="space-y-5">
          {grouped.filter(g => g.items.length > 0).map(g => (
            <div key={g.folder}>
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                {g.label}
                <span className="text-muted-foreground/60">·</span>
                <span className="text-muted-foreground/80">{g.items.length}</span>
              </h2>
              <div className="space-y-2">
                {g.items.map(c => (
                  <div key={c.id} className="rounded-xl bg-card border border-border p-3 flex items-start gap-3">
                    <Link
                      to="/contacts/$id"
                      params={{ id: c.id }}
                      className="flex-1 min-w-0 flex items-start gap-3 tap active:scale-[0.99]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {c.urgent && <AlertCircle className="h-4 w-4 shrink-0" style={{ color: "var(--urgent)" }} />}
                          <p className="font-semibold truncate">{c.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {c.company ?? "—"}{c.role ? ` · ${c.role}` : ""}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Pill tone="muted">{g.label}</Pill>
                          <span className="text-[11px] text-muted-foreground">{lastContactLabel(c.last_contact_date)}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                    </Link>
                    <button
                      onClick={() => followUp.mutate({ id: c.id, name: c.name })}
                      disabled={followUp.isPending}
                      className="shrink-0 inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-primary/15 text-primary border border-primary/30 text-xs font-semibold disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Follow up
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
