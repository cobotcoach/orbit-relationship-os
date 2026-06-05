import { createServerFn } from "@tanstack/react-start";


const MODEL = "claude-sonnet-4-20250514";
const ENDPOINT = "https://api.anthropic.com/v1/messages";

async function callAI(opts: {
  system: string;
  user: string;
  json?: boolean;
}): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  const userContent = opts.json
    ? `${opts.user}\n\nRespond with ONLY a valid JSON object, no prose, no code fences.`
    : opts.user;
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: opts.system,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("AI rate limit — try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI error ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
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



