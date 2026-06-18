import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { AI_MODEL, createLovableAiGatewayProvider } from "./ai-gateway.server";


const MODEL = AI_MODEL;

async function callAI(opts: {
  system: string;
  user: string;
  json?: boolean;
}): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured.");
  const userContent = opts.json
    ? `${opts.user}\n\nRespond with ONLY a valid JSON object, no prose, no code fences.`
    : opts.user;
  try {
    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway(MODEL),
      system: opts.system,
      prompt: userContent,
      maxOutputTokens: 4096,
    });
    return text;
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed.";
    if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
      throw new Error("AI rate limit — try again shortly.");
    }
    if (message.includes("402") || message.toLowerCase().includes("credits")) {
      throw new Error("AI credits exhausted.");
    }
    console.error(error);
    throw new Error("AI request failed — please try again.");
  }
}

function safeJSON<T>(s: string, fallback: T): T {
  try {
    const cleaned = s.replace(/^```json\s*|\s*```$/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

// 1. Auto-categorise a new contact
export const categoriseContact = createServerFn({ method: "POST" })
  .inputValidator((d: { description: string }) => d)
  .handler(async ({ data }) => {
    const sys = `You are ORBIT, an AI relationship OS for Dobot Robotics UK (cobots, robotics). Categorise the contact described.
Return JSON: { "type": one of [channel_partner, end_user, prospect, ecosystem_partner, distributor, internal], "folder": valid folder for that type, "industry": short string or null, "tags": string[] (max 5), "rationale": 1 sentence }.
Folders by type:
- channel_partner: active, onboarding_1, onboarding_2, onboarding_3, onboarding_4, lapsed
- end_user: enterprise, sme
- prospect: hot, warm, cold
- ecosystem_partner|distributor|internal: default`;
    const raw = await callAI({ system: sys, user: data.description, json: true });
    return safeJSON(raw, { type: "prospect", folder: "warm", industry: null, tags: [], rationale: "" });
  });

// 2. Process inbox input (email, transcript, comms)
export const processInbox = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string; existingContacts: { id: string; name: string; company: string | null }[] }) => d)
  .handler(async ({ data }) => {
    const sys = `You are ORBIT, an AI relationship OS for Dobot Robotics UK. Analyse the input (email/transcript/internal comms) and return JSON:
{
  "summary": one concise line,
  "sentiment": "positive"|"neutral"|"negative",
  "urgency": "low"|"medium"|"high"|"critical",
  "topics": string[] (max 6),
  "matched_contact_ids": string[] (ids from existingContacts that are clearly mentioned),
  "new_contacts": [{ "name": string, "company": string|null, "suggested_type": string, "suggested_folder": string, "rationale": string }],
  "actions": [{ "title": string, "urgency": "low"|"medium"|"high"|"critical", "contact_hint": string|null }]
}
Existing contacts (id — name — company):
${data.existingContacts.map(c => `${c.id} — ${c.name} — ${c.company ?? ""}`).join("\n")}`;
    const raw = await callAI({ system: sys, user: data.text, json: true });
    return safeJSON(raw, {
      summary: "",
      sentiment: "neutral",
      urgency: "medium",
      topics: [] as string[],
      matched_contact_ids: [] as string[],
      new_contacts: [] as { name: string; company: string | null; suggested_type: string; suggested_folder: string; rationale: string }[],
      actions: [] as { title: string; urgency: string; contact_hint: string | null }[],
    });
  });

// 3. Strategy for a single contact
export const generateStrategy = createServerFn({ method: "POST" })
  .inputValidator((d: {
    contact: unknown;
    activities: unknown[];
    actions: unknown[];
    quotes: unknown[];
    tickets: unknown[];
  }) => d)
  .handler(async ({ data }) => {
    const sys = `You are ORBIT, strategic AI advisor to Richard, UK Country Manager at Dobot Robotics. Be sharp, specific to robotics/cobots channel sales. No fluff.
Return markdown with these sections:
## Situation
2-4 sentences.
## Next 3 actions
1. **Action** — timeline — why
2. ...
3. ...
## Risks
- bullet
## Opportunities
- bullet
## Bold move
One paragraph — the unconventional play.`;
    const user = `CONTACT:\n${JSON.stringify(data.contact, null, 2)}\n\nACTIVITY TIMELINE:\n${JSON.stringify(data.activities, null, 2)}\n\nOPEN ACTIONS:\n${JSON.stringify(data.actions, null, 2)}\n\nQUOTES:\n${JSON.stringify(data.quotes, null, 2)}\n\nSUPPORT:\n${JSON.stringify(data.tickets, null, 2)}`;
    return { markdown: await callAI({ system: sys, user }) };
  });

// 4. Segment briefing
export const generateSegmentBriefing = createServerFn({ method: "POST" })
  .inputValidator((d: { folderLabel: string; contacts: unknown[] }) => d)
  .handler(async ({ data }) => {
    const sys = `You are ORBIT briefing Richard (UK Country Manager, Dobot Robotics) on a segment of his pipeline. Be punchy and specific.
Return markdown:
## Snapshot
1-2 sentences.
## Needs attention now
- **Name (company)** — why
## Stalled / risk
- bullet
## Patterns
- bullet
## Recommended focus this week
1. ...
2. ...
3. ...`;
    const user = `SEGMENT: ${data.folderLabel}\nCONTACTS:\n${JSON.stringify(data.contacts, null, 2)}`;
    return { markdown: await callAI({ system: sys, user }) };
  });

// 5. Prioritise tasks
export const prioritiseTasks = createServerFn({ method: "POST" })
  .inputValidator((d: { tasks: unknown[]; contacts: unknown[] }) => d)
  .handler(async ({ data }) => {
    const sys = `You are ORBIT, advising Richard (UK Country Manager, Dobot Robotics). Reorder the open tasks by strategic priority — weighting urgency, due dates, contact health (low health = more urgent), and channel-partner momentum.
Return JSON: { "ordered_ids": string[] (every task id, most important first), "summary": "1-2 sentence morning briefing covering the top focus today" }.`;
    const user = `TASKS:\n${JSON.stringify(data.tasks, null, 2)}\n\nCONTACTS:\n${JSON.stringify(data.contacts, null, 2)}`;
    const raw = await callAI({ system: sys, user, json: true });
    return safeJSON(raw, { ordered_ids: [] as string[], summary: "" });
  });

// 6. Extract contacts + intel from arbitrary text dump (chunked)
type ExtractResult = {
  contacts: {
    name: string;
    email: string | null;
    company: string | null;
    role: string | null;
    suggested_type: string;
    suggested_folder: string;
    tags: string[];
    rationale: string;
  }[];
  actions: { title: string; urgency: string; contact_hint: string | null }[];
  intel: { summary: string; topics: string[]; sentiment: string; urgency: string; contact_hint: string | null }[];
};

function chunkText(text: string, maxChars = 12000): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + maxChars, text.length);
    if (end < text.length) {
      const nl = text.lastIndexOf("\n", end);
      if (nl > i + maxChars * 0.5) end = nl;
    }
    chunks.push(text.slice(i, end));
    i = end;
  }
  return chunks;
}

export const extractImportData = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string; mode: "email" | "generic" }) => d)
  .handler(async ({ data }) => {
    const sys = `You are ORBIT, an AI relationship OS for Dobot Robotics UK (cobots, robotics). Analyse the supplied ${data.mode === "email" ? "email dump (headers, threads, CSV/PST export text)" : "arbitrary data dump (meeting notes, LinkedIn export, CRM export, spreadsheet text, etc.)"} and extract EVERY unique person mentioned plus any actions and intelligence.
Return JSON:
{
  "contacts": [{
    "name": string,
    "email": string|null,
    "company": string|null,
    "role": string|null,
    "suggested_type": one of [channel_partner, end_user, prospect, ecosystem_partner, distributor, internal],
    "suggested_folder": valid folder for that type,
    "tags": string[] (max 5),
    "rationale": 1 short sentence
  }],
  "actions": [{ "title": string, "urgency": "low"|"medium"|"high"|"critical", "contact_hint": string|null (name or email of related contact) }],
  "intel": [{ "summary": string, "topics": string[], "sentiment": "positive"|"neutral"|"negative", "urgency": "low"|"medium"|"high"|"critical", "contact_hint": string|null }]
}
Folders by type:
- channel_partner: active, onboarding_1, onboarding_2, onboarding_3, onboarding_4, lapsed
- end_user: enterprise, sme
- prospect: hot, warm, cold
- ecosystem_partner|distributor|internal: default
Deduplicate within your response. Skip generic role accounts (noreply@, info@). Be exhaustive — every named person counts.`;
    const chunks = chunkText(data.text);
    const merged: ExtractResult = { contacts: [], actions: [], intel: [] };
    const seen = new Set<string>();
    for (let i = 0; i < chunks.length; i++) {
      const user = chunks.length > 1
        ? `CHUNK ${i + 1} of ${chunks.length}:\n${chunks[i]}`
        : chunks[i];
      const raw = await callAI({ system: sys, user, json: true });
      const parsed = safeJSON<ExtractResult>(raw, { contacts: [], actions: [], intel: [] });
      for (const c of parsed.contacts ?? []) {
        const key = (c.email?.toLowerCase() ?? "") + "|" + (c.name ?? "").toLowerCase().trim();
        if (!c.name || seen.has(key)) continue;
        seen.add(key);
        merged.contacts.push(c);
      }
      for (const a of parsed.actions ?? []) merged.actions.push(a);
      for (const it of parsed.intel ?? []) merged.intel.push(it);
    }
    return merged;
  });

// 7. Refresh Smart Topics from new text (email/transcript)
type TopicRefreshResult = {
  updates: { id: string; status?: string; last_update?: string; next_action?: string | null; resolved?: boolean }[];
  new_topics: { title: string; contact_hint: string | null; status: string; last_update: string; next_action: string | null }[];
  summary: string;
};

export const refreshTopicsFromText = createServerFn({ method: "POST" })
  .inputValidator((d: {
    text: string;
    topics: { id: string; title: string; status: string; contact_name: string | null; last_update: string | null }[];
    contacts: { id: string; name: string; company: string | null }[];
  }) => d)
  .handler(async ({ data }) => {
    const sys = `You are ORBIT, an AI relationship OS for Dobot Robotics UK. You manage Smart Topics — open situations/threads tied to contacts (not tasks).
A new email or meeting transcript has arrived. Update existing topics, create new ones, and mark resolved ones.
Statuses: waiting_on_them, waiting_on_you, active, stalled, resolved.

Return JSON:
{
  "updates": [{ "id": existing topic id, "status"?: new status, "last_update"?: short one-line update text, "next_action"?: string|null, "resolved"?: boolean }],
  "new_topics": [{ "title": short topic title, "contact_hint": name/email of related contact or null, "status": one of above, "last_update": one-line summary, "next_action": string|null }],
  "summary": "1-2 sentence diff describing what changed overall"
}
Be conservative — only update topics if the text genuinely speaks to them. Always include a last_update when updating.`;
    const user = `EXISTING TOPICS:\n${JSON.stringify(data.topics, null, 2)}\n\nCONTACTS:\n${JSON.stringify(data.contacts, null, 2)}\n\nNEW INPUT:\n${data.text}`;
    const raw = await callAI({ system: sys, user, json: true });
    return safeJSON<TopicRefreshResult>(raw, { updates: [], new_topics: [], summary: "" });
  });

// 9. Process raw idea text into structured Idea
export const processIdea = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string; mode?: string | null }) => d)
  .handler(async ({ data }) => {
    const { ORBIT_CLASSIFIER_SYSTEM } = await import("./ingest.functions");
    const modeHint = data.mode
      ? `\n\nThe user is currently in MODE: "${data.mode}". Strongly prefer this mode unless the content clearly belongs elsewhere.`
      : "";
    const raw = await callAI({ system: ORBIT_CLASSIFIER_SYSTEM + modeHint, user: data.text, json: true });
    const parsed = safeJSON<{
      title?: string;
      summary?: string;
      mode?: string;
      energy_score?: number;
      tags?: string[];
    }>(raw, {});
    return {
      title: parsed.title ?? "Untitled idea",
      summary: parsed.summary ?? "",
      mode: parsed.mode ?? data.mode ?? "wild",
      energy_score: typeof parsed.energy_score === "number" ? parsed.energy_score : 5,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  });

// 10. Generate today's Focus from ideas + open actions
export const generateFocus = createServerFn({ method: "POST" })
  .inputValidator((d: { ideas: unknown[]; actions: unknown[]; mode?: string | null }) => d)
  .handler(async ({ data }) => {
    const modeHint = data.mode
      ? `\nThe user is currently in MODE: "${data.mode}". Weight focus items relevant to this mode much higher; only include other-mode items if genuinely critical today.`
      : "";
    const sys = `You are ORBIT, Richard's strategic focus engine (UK Country Manager, Dobot Robotics). Read recent ideas and open actions. Return EXACTLY 3 focus items for today, prioritised by impact + momentum.${modeHint}
Return JSON: { "items": [{ "title": short imperative, "why": one sentence on why this matters NOW, "priority": 1|2|3, "linked_idea_id": id|null, "linked_contact_id": id|null }] }
Priority 1 = most important. Pick the highest-leverage 3 — not just the loudest.`;
    const user = `RECENT IDEAS:\n${JSON.stringify(data.ideas, null, 2)}\n\nOPEN ACTIONS:\n${JSON.stringify(data.actions, null, 2)}`;
    const raw = await callAI({ system: sys, user, json: true });
    return safeJSON(raw, { items: [] as { title: string; why: string; priority: number; linked_idea_id: string | null; linked_contact_id: string | null }[] });
  });

// 8. Extract topics from a paste (quick-add)
export const extractTopicsFromText = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string; contacts: { id: string; name: string; company: string | null }[] }) => d)
  .handler(async ({ data }) => {
    const sys = `You are ORBIT. Extract Smart Topics (open situations/threads) from the supplied text. Each topic = one ongoing thing tied to a contact.
Return JSON: { "topics": [{ "title": short, "contact_hint": name|null, "status": one of [waiting_on_them, waiting_on_you, active, stalled], "last_update": one-line, "next_action": string|null }] }`;
    const user = `CONTACTS:\n${JSON.stringify(data.contacts, null, 2)}\n\nTEXT:\n${data.text}`;
    const raw = await callAI({ system: sys, user, json: true });
    return safeJSON(raw, { topics: [] as { title: string; contact_hint: string | null; status: string; last_update: string; next_action: string | null }[] });
  });

// 11. Synthesise a single Mission Control section
const MISSION_CONTROL_SYSTEM = `You are ORBIT, the strategic AI advisor for Richard Mawson who is building Cobot Coach (WMH Robotics Ltd) — a brand-agnostic collaborative robotics platform connecting SI integrators with UK manufacturing SMEs.

Key context:
- Richard is still employed at Dobot Robotics UK as Country Manager while building this
- Target: launch to first partners by end of July 2026
- Monetisation: undecided between Founding Partner fees (£10–15k) vs £300/month from-day-one vs free launch
- 5 known launch blockers: dead CTAs on solution pages, no legal pages, no partner commercial page, no cookie consent, no analytics
- Platform: cobotcoach.com — dark UI, Space Grotesk, Netflix-style marketplace
- Manufacturer journey: Scope → Detail → Prepare → Cost → Connect (board-ready business case, free, no vendor pitch)
- Integrator value: qualified inbound RFQs, solution listings, proposal builder
- Founding Partner outreach doc exists with offer: from £300/month, 10 integrators max
- Launch Audit (9 June 2026) flagged 5 launch-critical items: dead CTAs, legal pages, partner commercial page, cookie consent, analytics
- Key differentiators: free for manufacturers always, honest by default, verified partners only, no cold calls
- Competitor research done on HubSpot and Vention — freemium + education model identified as reference
- Financial model exists: manufacturer SaaS £50–£833/month by company size (alternative to Founding Partner model)
- Google Drive structure: 00-Ltd Company, 01-Business Plan, 02-Brand, 04-Research, 05-CRM, 07-Platform Build, 08-Sales, 09-Content
- Warm SI contacts (all currently Dobot channel partners — conflict to manage): JTR Automation (Jamie Ross), Labman, Astech Projects
- Min £115k turnover needed to match current Dobot take-home
- Biggest risk: losing focus across too many workstreams

Based on ALL captured data below, write a sharp 3-4 sentence synthesis that:
1. States honestly where this section currently stands
2. Identifies the single biggest unresolved question or blocker
3. Recommends the ONE next action with the most leverage
4. Flags any contradiction or confusion in the captured thinking

Be direct. Name the real issue. Don't be encouraging for its own sake.`;

export const synthesiseMissionControlSection = createServerFn({ method: "POST" })
  .inputValidator((d: {
    sectionTitle: string;
    sectionSlug: string;
    ownerSummary: string | null;
    blockers: string[];
    nextAction: string | null;
    confidence: number;
    ideas: unknown[];
    actions: unknown[];
    intel: unknown[];
    topics: unknown[];
    recentCommitments: unknown[];
  }) => d)
  .handler(async ({ data }) => {
    const sys = MISSION_CONTROL_SYSTEM + `\n\nYou are synthesising the SECTION: ${data.sectionTitle}`;
    const user = `OWNER SUMMARY:\n${data.ownerSummary || "(none written)"}\n\nCURRENT BLOCKERS:\n${(data.blockers || []).join("\n") || "(none logged)"}\n\nCURRENT NEXT ACTION:\n${data.nextAction || "(not set)"}\n\nCONFIDENCE: ${data.confidence}/10\n\nRECENT IDEAS (last 30d, cobot_coach mode):\n${JSON.stringify(data.ideas, null, 2)}\n\nOPEN ACTIONS:\n${JSON.stringify(data.actions, null, 2)}\n\nRECENT INTELLIGENCE:\n${JSON.stringify(data.intel, null, 2)}\n\nOPEN SMART TOPICS:\n${JSON.stringify(data.topics, null, 2)}\n\nRECENT WEEKLY COMMITMENTS (last 4 weeks):\n${JSON.stringify(data.recentCommitments, null, 2)}`;
    const text = await callAI({ system: sys, user });
    return { synthesis: text.trim() };
  });

// 12. Mission Control "Where are you stuck?" chat — uses full context across all sections
export const missionControlAsk = createServerFn({ method: "POST" })
  .inputValidator((d: {
    question: string;
    sections: { title: string; slug: string; status: string; confidence: number; ownerSummary: string | null; nextAction: string | null; aiSynthesis: string | null; blockers: string[] }[];
    recentIdeas: unknown[];
    recentIntel: unknown[];
    openActions: unknown[];
    openTopics: unknown[];
  }) => d)
  .handler(async ({ data }) => {
    const sys = MISSION_CONTROL_SYSTEM + `\n\nYou are now in DECISION-PARTNER mode. Richard has typed a question or problem he is stuck on. Use the FULL context of all 12 business sections plus the last 30 days of captured ideas, intel, open actions and open topics to answer.

Rules:
- Be sharp and specific. No generic encouragement, no "great question" preamble.
- Name the real trade-off if there is one.
- If the answer depends on something Richard hasn't decided yet, say so and point at the section.
- Reference concrete blockers, ideas, contacts or numbers when relevant.
- Keep responses to 4–8 short paragraphs or a tight bulleted list. No filler.`;
    const user = `RICHARD'S QUESTION:\n${data.question}\n\n=== BUSINESS SECTIONS (12) ===\n${JSON.stringify(data.sections, null, 2)}\n\n=== RECENT IDEAS (30d) ===\n${JSON.stringify(data.recentIdeas, null, 2)}\n\n=== RECENT INTEL (30d) ===\n${JSON.stringify(data.recentIntel, null, 2)}\n\n=== OPEN ACTIONS ===\n${JSON.stringify(data.openActions, null, 2)}\n\n=== OPEN SMART TOPICS ===\n${JSON.stringify(data.openTopics, null, 2)}`;
    const text = await callAI({ system: sys, user });
    return { answer: text.trim() };
  });





