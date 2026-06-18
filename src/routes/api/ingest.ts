import { createFileRoute } from "@tanstack/react-router";
import { ingestTranscript } from "@/lib/ingest.functions";

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

        const result = await ingestTranscript({
          transcript,
          source: typeof body.source === "string" && body.source ? body.source : "plaud",
          title: typeof body.title === "string" ? body.title : null,
          original_filename: typeof body.original_filename === "string" ? body.original_filename : null,
          recorded_at: typeof body.recorded_at === "string" ? body.recorded_at : null,
          duration_seconds: typeof body.duration_seconds === "number" ? body.duration_seconds : null,
        });
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});
