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
        const ext =
          mime === "audio/mp4" ? "mp4" :
          mime === "audio/mpeg" ? "mp3" :
          mime === "audio/wav" ? "wav" :
          mime === "audio/ogg" ? "ogg" :
          "webm";

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        upstream.append("file", audio, `recording.${ext}`);
        upstream.append("stream", "true");

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstream,
        });

        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => "");
          return new Response(detail || `Transcription failed: ${res.status}`, { status: res.status });
        }

        return new Response(res.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
          },
        });
      },
    },
  },
});
