import { createFileRoute } from "@tanstack/react-router";
import { createVideoJob, resolveDuration, resolveVideoModel } from "@/lib/video-gateway.server";

export const Route = createFileRoute("/api/generate-video")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt, model, seconds } = await request.json();
        if (typeof prompt !== "string" || !prompt.trim()) {
          return new Response("A non-empty prompt is required", { status: 400 });
        }
        if (!process.env["LOVABLE_API_KEY"]) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }
        const resolved = resolveVideoModel(model);
        try {
          const upstream = await createVideoJob(
            prompt,
            resolved.model,
            resolved.family,
            resolveDuration(seconds),
            request.signal,
          );
          return new Response(upstream.body, {
            status: upstream.status,
            headers: {
              "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
              "Cache-Control": "no-cache",
            },
          });
        } catch (error) {
          if (request.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
            return new Response(null, { status: 499 });
          }
          throw error;
        }
      },
    },
  },
});
