import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { db } from "@/lib/db";
import { CONTACT_TYPES, FOLDERS_BY_TYPE, ContactType } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/contacts/new")({
  head: () => ({ meta: [{ title: "New Partner — ORBIT" }] }),
  component: NewContact,
});

function NewContact() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [type, setType] = useState<ContactType>("partner");
  const [folder, setFolder] = useState("approached");
  const [notes, setNotes] = useState("");

  const saveM = useMutation({
    mutationFn: async () => {
      const c = await db.contacts.insert({
        name, company: company || null, role: role || null,
        type, folder,
        tags: [], urgent: false, notes: notes || null,
        health_score: 50,
      });
      return c;
    },
    onSuccess: (c) => { nav({ to: "/contacts/$id", params: { id: c.id } }); },
  });

  const folders = FOLDERS_BY_TYPE[type];

  return (
    <Shell title="New Partner" action={
      <Link to="/contacts" className="text-muted-foreground p-2"><ArrowLeft className="h-5 w-5" /></Link>
    }>
      <div className="space-y-4">
        <Field label="Name"><input value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Company"><input value={company} onChange={e => setCompany(e.target.value)} /></Field>
        <Field label="Role"><input value={role} onChange={e => setRole(e.target.value)} /></Field>

        <Field label="Type">
          <select value={type} onChange={e => { const t = e.target.value as ContactType; setType(t); setFolder(FOLDERS_BY_TYPE[t][0].value); }}>
            {CONTACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>

        <Field label="Stage">
          <select value={folder} onChange={e => setFolder(e.target.value)}>
            {folders.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </Field>

        <Field label="Notes"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} /></Field>

        <button onClick={() => saveM.mutate()} disabled={!name || saveM.isPending}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
          {saveM.isPending ? "Saving…" : "Create partner"}
        </button>
      </div>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}
