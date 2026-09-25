import { createFileRoute } from "@tanstack/react-router";
import { getVideoContent, isValidJobId } from "@/lib/video-gateway.server";

export const Route = createFileRoute("/api/video-content")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("id") ?? "";
        if (!isValidJobId(id)) return new Response("Invalid job id", { status: 400 });
        if (!process.env["LOVABLE_API_KEY"]) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }
        try {
          const upstream = await getVideoContent(id, request.signal);
          return new Response(upstream.body, {
            status: upstream.status,
            headers: {
              "Content-Type": upstream.headers.get("Content-Type") ?? "video/mp4",
              "Cache-Control": "private, max-age=3600",
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
