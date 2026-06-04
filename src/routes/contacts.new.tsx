import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shell } from "@/components/Shell";
import { Section } from "@/components/ui-bits";
import { db } from "@/lib/db";
import { categoriseContact } from "@/lib/ai.functions";
import { CONTACT_TYPES, FOLDERS_BY_TYPE, ContactType } from "@/lib/types";
import { Sparkles, Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/contacts/new")({
  head: () => ({ meta: [{ title: "New Contact — ORBIT" }] }),
  component: NewContact,
});

function NewContact() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState<ContactType>("prospect");
  const [folder, setFolder] = useState("warm");
  const [industry, setIndustry] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [urgent, setUrgent] = useState(false);
  const [notes, setNotes] = useState("");
  const [rationale, setRationale] = useState("");

  const categorise = useServerFn(categoriseContact);
  const catM = useMutation({
    mutationFn: async () => categorise({ data: { description: `${name} at ${company}. ${role}. ${desc}` } }),
    onSuccess: (r) => {
      if (r.type && CONTACT_TYPES.find(t => t.value === r.type)) {
        setType(r.type as ContactType);
        const folders = FOLDERS_BY_TYPE[r.type as ContactType];
        const folderMatch = folders.find(f => f.value === r.folder);
        setFolder(folderMatch?.value ?? folders[0].value);
      }
      if (r.industry) setIndustry(r.industry);
      if (Array.isArray(r.tags)) setTags(r.tags);
      if (r.rationale) setRationale(r.rationale);
    },
  });

  const saveM = useMutation({
    mutationFn: async () => {
      const c = await db.contacts.insert({
        name, company: company || null, role: role || null,
        type, folder, industry: industry || null,
        tags, urgent, notes: notes || desc || null,
        health_score: 50,
      });
      return c;
    },
    onSuccess: (c) => { nav({ to: "/contacts/$id", params: { id: c.id } }); },
  });

  const folders = FOLDERS_BY_TYPE[type];

  return (
    <Shell title="New Contact" action={
      <Link to="/contacts" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
    }>
      <div className="space-y-4">
        <Field label="Name"><input value={name} onChange={e => setName(e.target.value)} className={inputClass} /></Field>
        <Field label="Company"><input value={company} onChange={e => setCompany(e.target.value)} className={inputClass} /></Field>
        <Field label="Role"><input value={role} onChange={e => setRole(e.target.value)} className={inputClass} /></Field>
        <Field label="Describe them (for AI categorisation)">
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
            placeholder="e.g. UK-based system integrator focused on welding automation, met at MACH"
            className={inputClass} />
        </Field>

        <button
          onClick={() => catM.mutate()}
          disabled={!name || catM.isPending}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/15 text-primary border border-primary/30 text-sm font-medium tap disabled:opacity-50"
        >
          {catM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Auto-categorise with AI
        </button>

        {rationale && (
          <div className="rounded-lg bg-primary/10 border border-primary/30 p-2.5 text-xs text-primary">
            <strong>AI:</strong> {rationale}
          </div>
        )}

        <Section title="Type & folder">
          <select value={type} onChange={e => { const t = e.target.value as ContactType; setType(t); setFolder(FOLDERS_BY_TYPE[t][0].value); }} className={inputClass}>
            {CONTACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={folder} onChange={e => setFolder(e.target.value)} className={`${inputClass} mt-2`}>
            {folders.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </Section>

        <Field label="Industry"><input value={industry} onChange={e => setIndustry(e.target.value)} className={inputClass} /></Field>
        <Field label="Tags (comma separated)">
          <input value={tags.join(", ")} onChange={e => setTags(e.target.value.split(",").map(t => t.trim()).filter(Boolean))} className={inputClass} />
        </Field>
        <Field label="Notes"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputClass} /></Field>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={urgent} onChange={e => setUrgent(e.target.checked)} className="h-4 w-4 accent-[color:var(--urgent)]" />
          <span className="text-sm">Mark as urgent</span>
        </label>

        <button onClick={() => saveM.mutate()} disabled={!name || saveM.isPending}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold tap disabled:opacity-50">
          {saveM.isPending ? "Saving…" : "Create contact"}
        </button>
      </div>
    </Shell>
  );
}

const inputClass = "w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}
