import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const form = await request.formData();
        const audio = form.get("file");
        if (!(audio instanceof Blob)) {
          return new Response("Missing audio file", { status: 400 });
        }
        if (audio.size < 1024) {
          return new Response("Recording too short", { status: 400 });
        }

        const mime = audio.type.split(";")[0] || "audio/webm";
        const allowed = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"]);
        if (!allowed.has(mime)) {
          return new Response("Unsupported recording format", { status: 400 });
        }

        const ext =
          mime === "audio/mp4" ? "mp4" :
          mime === "audio/mpeg" ? "mp3" :
          mime === "audio/wav" ? "wav" :
          mime === "audio/ogg" ? "ogg" :
          "webm";

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        upstream.append("file", audio, `recording.${ext}`);
        upstream.append("language", "en");
        upstream.append("prompt", "Richard is capturing quick founder notes. Transcribe exactly once in natural English. Do not repeat phrases, do not invent filler words, and ignore silence or background noise.");

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { "Lovable-API-Key": key },
          signal: request.signal,
          body: upstream,
        });

        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => "");
          return new Response(detail || `Transcription failed: ${res.status}`, { status: res.status });
        }

        return Response.json(await res.json());
      },
    },
  },
});
