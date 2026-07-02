import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { AI_MODEL, createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type Classification = {
  mode: "dobot" | "cobot_coach" | "life" | "wild";
  type: "idea" | "intelligence" | "action" | "note";
  title: string;
  summary: string;
  energy_score: number;
  tags: string[];
  urgency: "low" | "medium" | "high" | "critical";
};

function safeJSON<T>(s: string, fallback: T): T {
  try {
    const cleaned = s.replace(/^```json\s*|\s*```$/g, "").replace(/^```\s*|\s*```$/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

export const Mawson_CLASSIFIER_SYSTEM = `You are Mawson, classifying a raw voice-note transcript or meeting note for Richard Mawson (UK Country Manager at Dobot Robotics, and founder of Cobot Coach — a brand-agnostic collaborative robotics consultancy and SI enablement platform targeting UK manufacturing SMEs).

Richard's context:
- Dobot: his day job managing ~15 SI channel partners across UK & Ireland, EMEA marketing, partner enablement
- Cobot Coach: his venture, WMH Robotics Ltd. A platform connecting SI integrators with SME manufacturers. Founding Partner model: ~20 slots, £10-15k Year 1, £15k/yr fixed forever. Key deadline: PPMA NEC September 2026. Warm targets: JTR Automation (Jamie Ross), Labman, Astech Projects. Grant sources: Made Smarter, UKSPF, Innovate UK.
- Key narrative: "race to value" — cobot deployment faster than hiring. UKCA/PUWER compliance as competitive advantage.

Return ONLY a JSON object:
{
  "mode": "dobot" | "cobot_coach" | "life" | "wild",
  "type": "idea" | "intelligence" | "action" | "note",
  "title": short punchy one-liner max 80 chars,
  "summary": 2-3 sentence summary preserving key specifics,
  "energy_score": integer 1-10,
  "tags": string[] max 6 lowercase — MUST include one of [monetisation, sales, content, build, launch, product] if the content relates to Cobot Coach. Also include specific tags like [grants, founding-partner, ppma, ukca, welding, demo, video, sme] where relevant,
  "urgency": "low" | "medium" | "high" | "critical"
}

Mode: dobot = Dobot Robotics UK day job; cobot_coach = Cobot Coach venture; life = personal/family; wild = blue-sky unrelated.
Type: action = concrete to-do with a clear next step; idea = new concept or strategy worth developing; intelligence = market/competitor/customer signal; note = general observation.
Energy: 1 = vague rambling, 10 = sharp specific high-conviction insight with clear commercial value.`;

async function classify(transcript: string): Promise<Classification> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI not configured");
  const gateway = createLovableAiGatewayProvider(key);
  const { text } = await generateText({
    model: gateway(AI_MODEL),
    system: Mawson_CLASSIFIER_SYSTEM,
    prompt: `${transcript}\n\nRespond with ONLY a valid JSON object, no prose, no code fences.`,
    maxOutputTokens: 1024,
  });
  return safeJSON<Classification>(text, {
    mode: "dobot",
    type: "note",
    title: transcript.slice(0, 80),
    summary: transcript.slice(0, 280),
    energy_score: 5,
    tags: [],
    urgency: "medium",
  });
}

export type IngestResult = {
  ok: boolean;
  type?: "idea" | "action" | "intelligence" | "note";
  id?: string;
  mode?: string;
  log_id?: string | null;
  error?: string;
};

export async function ingestTranscript(input: {
  transcript: string;
  source?: string;
  title?: string | null;
  original_filename?: string | null;
  recorded_at?: string | null;
  duration_seconds?: number | null;
}): Promise<IngestResult> {
  const transcript = input.transcript.trim();
  if (!transcript) return { ok: false, error: "Missing transcript" };

  const source = input.source || "manual";
  const originalFilename = input.original_filename ?? input.title ?? null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: logRow, error: logErr } = await supabaseAdmin
    .from("captures_log")
    .insert({
      source,
      original_filename: originalFilename,
      raw_text: transcript,
      char_count: transcript.length,
      status: "processing",
    } as never)
    .select("id")
    .single();
  const logId: string | null = logErr ? null : (logRow?.id ?? null);

  const finishLog = async (patch: Record<string, unknown>) => {
    if (!logId) return;
    await supabaseAdmin.from("captures_log").update(patch as never).eq("id", logId);
  };

  try {
    const c = await classify(transcript);
    const title = input.title || c.title;

    if (c.type === "action") {
      const { data, error } = await supabaseAdmin
        .from("actions")
        .insert({ title, description: c.summary, urgency: c.urgency, status: "open" } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await finishLog({ status: "done", routed_to: "actions", routed_id: data.id, mode: c.mode });
      return { ok: true, type: "action", id: data.id, mode: c.mode, log_id: logId };
    }

    if (c.type === "intelligence" || c.type === "note") {
      const { data, error } = await supabaseAdmin
        .from("intelligence_items")
        .insert({
          source,
          raw_input: transcript,
          summary: c.summary,
          topics: c.tags,
          urgency: c.urgency,
          extracted: {
            title,
            mode: c.mode,
            type: c.type,
            energy_score: c.energy_score,
            recorded_at: input.recorded_at,
            duration_seconds: input.duration_seconds,
          },
        } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await finishLog({ status: "done", routed_to: "intelligence_items", routed_id: data.id, mode: c.mode });
      return { ok: true, type: c.type, id: data.id, mode: c.mode, log_id: logId };
    }

    const { data, error } = await supabaseAdmin
      .from("ideas")
      .insert({
        raw_text: transcript,
        title,
        summary: c.summary,
        mode: c.mode,
        energy_score: c.energy_score,
        tags: c.tags,
        source,
        status: "new",
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await finishLog({ status: "done", routed_to: "ideas", routed_id: data.id, mode: c.mode });
    return { ok: true, type: "idea", id: data.id, mode: c.mode, log_id: logId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finishLog({ status: "failed", error_text: msg });
    return { ok: false, error: msg, log_id: logId };
  }
}

export const ingestFromBrowser = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      transcript: String(d.transcript ?? ""),
      source: typeof d.source === "string" ? d.source : undefined,
      title: typeof d.title === "string" ? d.title : null,
      original_filename: typeof d.original_filename === "string" ? d.original_filename : null,
      recorded_at: typeof d.recorded_at === "string" ? d.recorded_at : null,
    };
  })
  .handler(async ({ data }) => ingestTranscript(data));

export const reclassifyIdea = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const d = (data ?? {}) as Record<string, unknown>;
    return { id: String(d.id ?? "") };
  })
  .handler(async ({ data }) => {
    if (!data.id) return { ok: false, error: "Missing id" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: idea, error: fetchErr } = await supabaseAdmin
      .from("ideas")
      .select("id, raw_text")
      .eq("id", data.id)
      .single();
    if (fetchErr || !idea) return { ok: false, error: fetchErr?.message ?? "Idea not found" };
    const transcript = (idea as { raw_text: string | null }).raw_text?.trim();
    if (!transcript) return { ok: false, error: "Idea has no raw_text to re-classify" };
    try {
      const c = await classify(transcript);
      const { error: updErr } = await supabaseAdmin
        .from("ideas")
        .update({
          title: c.title,
          summary: c.summary,
          mode: c.mode,
          energy_score: c.energy_score,
          tags: c.tags,
        } as never)
        .eq("id", data.id);
      if (updErr) throw new Error(updErr.message);
      return { ok: true, mode: c.mode, tags: c.tags, title: c.title };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  });
