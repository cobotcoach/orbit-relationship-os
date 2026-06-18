import { createServerFn } from "@tanstack/react-start";

const DRIVE_GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";
const DOCS_GATEWAY = "https://connector-gateway.lovable.dev/google_docs/v1";
const FOLDER_ID = "10qAq6c-Mc15LtMVRXNduSa9kZTTSw71w";
const ORBIT_URL = "https://orbithub2026.lovable.app/mission";
const SEP = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

function driveHeaders(): Record<string, string> {
  const lovable = process.env.LOVABLE_API_KEY;
  const drive = process.env.GOOGLE_DRIVE_API_KEY;
  if (!lovable || !drive) throw new Error("Google Drive is not configured.");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": drive,
    "Content-Type": "application/json",
  };
}
function docsHeaders(): Record<string, string> {
  const lovable = process.env.LOVABLE_API_KEY;
  const docs = process.env.GOOGLE_DOCS_API_KEY;
  if (!lovable || !docs) throw new Error("Google Docs is not configured.");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": docs,
    "Content-Type": "application/json",
  };
}

interface SectionRow {
  slug: string;
  title: string;
  emoji: string;
  status: string;
  owner_summary: string | null;
  ai_synthesis: string | null;
  ai_synthesised_at: string | null;
  next_action: string | null;
  blockers: string[] | null;
  confidence_score: number | null;
  drive_doc_id: string | null;
}

function ideaTouchesSection(idea: { title: string | null; summary: string | null; tags: string[] | null }, slug: string): boolean {
  const tags = (idea.tags ?? []).map(t => t.toLowerCase());
  if (tags.includes(slug)) return true;
  const haystack = `${idea.title ?? ""} ${idea.summary ?? ""}`.toLowerCase();
  return haystack.includes(slug);
}

function buildDocContent(args: {
  section: SectionRow;
  decisions: { title: string; decision: string; reasoning: string | null; made_at: string }[];
  ideas: { title: string | null; summary: string | null; energy_score: number }[];
  commitments: { week_starting: string; commitment: string; status: string }[];
}): string {
  const { section, decisions, ideas, commitments } = args;
  const lines: string[] = [];
  lines.push(`${section.emoji} ${section.title} — Cobot Coach`);
  lines.push(`Last synced from ORBIT: ${new Date().toISOString()}`);
  lines.push(`Status: ${section.status} | Confidence: ${section.confidence_score ?? "-"}/10`);
  lines.push(`View in ORBIT: ${ORBIT_URL}`);
  lines.push(SEP);
  lines.push("");
  lines.push("WHAT THIS IS");
  lines.push(section.owner_summary?.trim() || "(not yet written)");
  lines.push("");
  lines.push(SEP);
  lines.push("AI SYNTHESIS");
  lines.push(`Last generated: ${section.ai_synthesised_at ?? "(never)"}`);
  lines.push(section.ai_synthesis?.trim() || "(not yet generated)");
  lines.push("");
  lines.push(SEP);
  lines.push("NEXT ACTION");
  lines.push(section.next_action?.trim() || "(none set)");
  lines.push("");
  lines.push("BLOCKERS");
  if ((section.blockers ?? []).length === 0) {
    lines.push("(none logged)");
  } else {
    for (const b of section.blockers ?? []) lines.push(`• ${b}`);
  }
  lines.push("");
  lines.push(SEP);
  lines.push("DECISIONS");
  if (decisions.length === 0) {
    lines.push("(no decisions logged yet)");
  } else {
    for (const d of decisions) {
      const date = new Date(d.made_at).toISOString().slice(0, 10);
      lines.push(`${date} | ${d.title}`);
      lines.push(`Decided: ${d.decision}`);
      if (d.reasoning) lines.push(`Reason: ${d.reasoning}`);
      lines.push("");
    }
  }
  lines.push(SEP);
  lines.push("RECENT IDEAS (last 30 days, cobot_coach mode)");
  if (ideas.length === 0) {
    lines.push("(no recent ideas)");
  } else {
    for (const i of ideas) {
      lines.push(`• ${i.title ?? "(untitled)"} (energy: ${i.energy_score}/10)`);
      if (i.summary) lines.push(`  ${i.summary}`);
    }
  }
  lines.push("");
  lines.push(SEP);
  lines.push("WEEKLY COMMITMENTS (last 4 weeks)");
  if (commitments.length === 0) {
    lines.push("(no commitments logged)");
  } else {
    for (const c of commitments) {
      lines.push(`• ${c.week_starting} — ${c.commitment} — ${c.status}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

async function createDoc(title: string): Promise<{ id: string; url: string }> {
  const res = await fetch(`${DRIVE_GATEWAY}/files?supportsAllDrives=true`, {
    method: "POST",
    headers: driveHeaders(),
    body: JSON.stringify({
      name: title,
      mimeType: "application/vnd.google-apps.document",
      parents: [FOLDER_ID],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive create failed ${res.status}: ${body}`);
  }
  const json = await res.json() as { id: string };
  return { id: json.id, url: `https://docs.google.com/document/d/${json.id}/edit` };
}

async function renameDoc(docId: string, title: string): Promise<void> {
  const res = await fetch(`${DRIVE_GATEWAY}/files/${docId}?supportsAllDrives=true`, {
    method: "PATCH",
    headers: driveHeaders(),
    body: JSON.stringify({ name: title }),
  });
  if (!res.ok) {
    // non-fatal
    console.warn("Drive rename failed", res.status, await res.text());
  }
}

async function getDocEndIndex(docId: string): Promise<number> {
  const res = await fetch(`${DOCS_GATEWAY}/documents/${docId}`, {
    method: "GET",
    headers: docsHeaders(),
  });
  if (!res.ok) throw new Error(`Docs get failed ${res.status}: ${await res.text()}`);
  const json = await res.json() as { body?: { content?: { endIndex?: number }[] } };
  const items = json.body?.content ?? [];
  if (items.length === 0) return 2;
  const last = items[items.length - 1];
  return Math.max(last.endIndex ?? 2, 2);
}

async function replaceDocContent(docId: string, content: string): Promise<void> {
  const endIndex = await getDocEndIndex(docId);
  const requests: unknown[] = [];
  if (endIndex > 2) {
    requests.push({
      deleteContentRange: { range: { startIndex: 1, endIndex: endIndex - 1 } },
    });
  }
  requests.push({ insertText: { location: { index: 1 }, text: content } });
  const res = await fetch(`${DOCS_GATEWAY}/documents/${docId}:batchUpdate`, {
    method: "POST",
    headers: docsHeaders(),
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) throw new Error(`Docs batchUpdate failed ${res.status}: ${await res.text()}`);
}

async function readDocText(docId: string): Promise<string> {
  const res = await fetch(`${DOCS_GATEWAY}/documents/${docId}`, {
    method: "GET",
    headers: docsHeaders(),
  });
  if (!res.ok) throw new Error(`Docs read failed ${res.status}: ${await res.text()}`);
  const json = await res.json() as {
    body?: { content?: Array<{ paragraph?: { elements?: Array<{ textRun?: { content?: string } }> } }> };
  };
  const out: string[] = [];
  for (const el of json.body?.content ?? []) {
    const p = el.paragraph;
    if (!p) continue;
    for (const e of p.elements ?? []) {
      const t = e.textRun?.content;
      if (t) out.push(t);
    }
  }
  return out.join("");
}

function mondayISO(d = new Date()) {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

export const syncSectionToDrive = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sec, error: secErr } = await supabaseAdmin
      .from("business_sections")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (secErr) throw secErr;
    if (!sec) throw new Error(`Section ${data.slug} not found`);
    const section = sec as unknown as SectionRow;

    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const fourWeeksAgo = new Date(Date.now() - 28 * 86_400_000).toISOString().slice(0, 10);

    const [decRes, ideasRes, commitsRes] = await Promise.all([
      supabaseAdmin.from("decisions").select("title,decision,reasoning,made_at,section_slug")
        .eq("section_slug", data.slug).order("made_at", { ascending: false }).limit(50),
      supabaseAdmin.from("ideas").select("title,summary,tags,energy_score,created_at,mode")
        .eq("mode", "cobot_coach").gte("created_at", since).order("created_at", { ascending: false }).limit(200),
      supabaseAdmin.from("weekly_commitments").select("week_starting,commitment,status,section_slug")
        .eq("section_slug", data.slug).gte("week_starting", fourWeeksAgo)
        .order("week_starting", { ascending: false }),
    ]);
    if (decRes.error) throw decRes.error;
    if (ideasRes.error) throw ideasRes.error;
    if (commitsRes.error) throw commitsRes.error;

    const decisions = (decRes.data ?? []) as { title: string; decision: string; reasoning: string | null; made_at: string }[];
    const allIdeas = (ideasRes.data ?? []) as { title: string | null; summary: string | null; tags: string[] | null; energy_score: number }[];
    const ideas = allIdeas.filter(i => ideaTouchesSection(i, data.slug)).slice(0, 25);
    const commitments = (commitsRes.data ?? []) as { week_starting: string; commitment: string; status: string }[];

    const title = `${section.emoji} ${section.title} — Cobot Coach`;
    const content = buildDocContent({ section, decisions, ideas, commitments });

    let docId = section.drive_doc_id;
    let docUrl: string | null = null;
    if (!docId) {
      const created = await createDoc(title);
      docId = created.id;
      docUrl = created.url;
    } else {
      docUrl = `https://docs.google.com/document/d/${docId}/edit`;
      await renameDoc(docId, title);
    }
    await replaceDocContent(docId, content);

    const syncedAt = new Date().toISOString();
    const { error: updErr } = await supabaseAdmin
      .from("business_sections")
      .update({
        drive_doc_id: docId,
        drive_doc_url: docUrl,
        drive_synced_at: syncedAt,
        drive_doc_content: content,
        last_updated: syncedAt,
      } as never)
      .eq("slug", data.slug);
    if (updErr) throw updErr;

    return { ok: true as const, url: docUrl, syncedAt };
  });

export const pullFromDrive = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { data: sec, error: secErr } = await supabaseAdmin
      .from("business_sections")
      .select("slug,drive_doc_id,owner_summary")
      .eq("slug", data.slug)
      .maybeSingle();
    if (secErr) throw secErr;
    if (!sec) throw new Error(`Section ${data.slug} not found`);
    const row = sec as { slug: string; drive_doc_id: string | null; owner_summary: string | null };
    if (!row.drive_doc_id) {
      return { ok: false as const, updated: false, reason: "No Drive doc yet — sync first." };
    }
    const text = await readDocText(row.drive_doc_id);

    // Parse "WHAT THIS IS" section to update owner_summary
    let owner: string | null = null;
    const markers = ["WHAT THIS IS"];
    for (const m of markers) {
      const idx = text.indexOf(m);
      if (idx === -1) continue;
      const after = text.slice(idx + m.length);
      const stop = after.indexOf(SEP);
      const block = (stop >= 0 ? after.slice(0, stop) : after).trim();
      if (block && block !== "(not yet written)") owner = block;
      break;
    }

    const syncedAt = new Date().toISOString();
    const patch: Record<string, unknown> = {
      drive_doc_content: text,
      drive_synced_at: syncedAt,
      last_updated: syncedAt,
    };
    let updated = false;
    if (owner && owner !== row.owner_summary) {
      patch.owner_summary = owner;
      updated = true;
    }
    const { error: updErr } = await supabaseAdmin
      .from("business_sections")
      .update(patch as never)
      .eq("slug", data.slug);
    if (updErr) throw updErr;
    return { ok: true as const, updated };
  });

// helper kept exported in case future server fns need the same week math
export { mondayISO as _mondayISO };
