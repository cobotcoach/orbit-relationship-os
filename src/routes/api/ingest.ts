import { createFileRoute } from "@tanstack/react-router";
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

async function classify(transcript: string): Promise<Classification> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI not configured");
  const gateway = createLovableAiGatewayProvider(key);
  const system = `You are ORBIT, classifying a raw voice-note transcript for Richard (UK Country Manager, Dobot Robotics — cobots, channel partners).
Return ONLY a JSON object with these fields:
{
  "mode": "dobot" | "cobot_coach" | "life" | "wild",
  "type": "idea" | "intelligence" | "action" | "note",
  "title": short one-liner (max 80 chars),
  "summary": 2-3 sentence summary,
  "energy_score": integer 1-10 (signal/conviction in the language),
  "tags": string[] (max 6, lowercase),
  "urgency": "low" | "medium" | "high" | "critical"
}
Mode guide: dobot = Dobot Robotics UK business; cobot_coach = the Cobot Coach education brand; life = personal/family/health; wild = anything else / wild ideas.
Type guide: action = a concrete to-do; idea = a new concept worth capturing; intelligence = market/competitor/customer signal; note = passive observation.`;
  const { text } = await generateText({
    model: gateway(AI_MODEL),
    system,
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

export const Route = createFileRoute("/api/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.INGEST_API_KEY;
        if (!expected) {
          return Response.json({ ok: false, error: "INGEST_API_KEY not configured" }, { status: 500 });
        }
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
        if (!token || token !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: Record<string, unknown> = {};
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const transcript = String(body.transcript ?? body.text ?? "").trim();
        if (!transcript) {
          return Response.json({ ok: false, error: "Missing transcript/text" }, { status: 400 });
        }
        const source = typeof body.source === "string" && body.source ? body.source : "plaud";
        const providedTitle = typeof body.title === "string" ? body.title : null;
        const recordedAt = typeof body.recorded_at === "string" ? body.recorded_at : null;
        const durationSeconds = typeof body.duration_seconds === "number" ? body.duration_seconds : null;
        const originalFilename = typeof body.original_filename === "string" ? body.original_filename : (providedTitle ?? null);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Log the capture first
        const { data: logRow, error: logErr } = await supabaseAdmin
          .from("captures_log")
          .insert({
            source,
            original_filename: originalFilename,
            raw_text: transcript,
            char_count: transcript.length,
            status: "processing",
          })
          .select("id")
          .single();
        const logId: string | null = logErr ? null : (logRow?.id ?? null);

        const finishLog = async (patch: Record<string, unknown>) => {
          if (!logId) return;
          await supabaseAdmin.from("captures_log").update(patch as never).eq("id", logId);
        };

        try {
          const c = await classify(transcript);
          const title = providedTitle || c.title;

          if (c.type === "action") {
            const { data, error } = await supabaseAdmin
              .from("actions")
              .insert({ title, description: c.summary, urgency: c.urgency, status: "open" })
              .select("id")
              .single();
            if (error) throw new Error(error.message);
            await finishLog({ status: "done", routed_to: "actions", routed_id: data.id, mode: c.mode });
            return Response.json({ ok: true, type: "action", id: data.id, mode: c.mode, log_id: logId });
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
                  recorded_at: recordedAt,
                  duration_seconds: durationSeconds,
                },
              })
              .select("id")
              .single();
            if (error) throw new Error(error.message);
            await finishLog({ status: "done", routed_to: "intelligence_items", routed_id: data.id, mode: c.mode });
            return Response.json({ ok: true, type: c.type, id: data.id, mode: c.mode, log_id: logId });
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
            })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          await finishLog({ status: "done", routed_to: "ideas", routed_id: data.id, mode: c.mode });
          return Response.json({ ok: true, type: "idea", id: data.id, mode: c.mode, log_id: logId });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await finishLog({ status: "failed", error_text: msg });
          return Response.json({ ok: false, error: msg, log_id: logId }, { status: 500 });
        }
      },
    },
  },
});
