import { createFileRoute } from "@tanstack/react-router";
import { generateImage, imageSettings, resolveImageModel } from "@/lib/image-gateway.server";

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt, model, stream = true } = await request.json();
        if (typeof prompt !== "string" || !prompt.trim()) {
          return new Response("A non-empty prompt is required", { status: 400 });
        }
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const resolved = resolveImageModel(model);
        try {
          const upstream = await generateImage(
            { ...imageSettings, apiKey, ...resolved },
            prompt,
            stream,
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
