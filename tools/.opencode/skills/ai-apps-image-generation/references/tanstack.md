# TanStack Start image routes

Use a server route under `src/routes/api/`, not `createServerFn`: typed RPC serializes responses and cannot forward the SSE image stream or multipart upload. Read [request formats](knowledge://skill/ai-apps-image-generation/references/request-formats.md), [gateway-request.ts](knowledge://skill/ai-apps-image-generation/examples/gateway-request.ts), and [streaming](knowledge://skill/ai-apps-image-generation/references/streaming.md) first.

Copy the server helpers into `src/lib/image-gateway.server.ts`. Define and export `imageSettings: Omit<ImageConfig, "apiKey">` in that server-only module with the actual `baseURL`, `model` and `format` from `ai-gateway-models` knowledge. Keep `LOVABLE_API_KEY` server-side.

`src/routes/api/generate-image.ts`:

```ts
import { createFileRoute } from "@tanstack/react-router";
import { generateImage, imageSettings } from "@/lib/image-gateway.server";

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt, stream = true } = await request.json();
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const upstream = await generateImage({ ...imageSettings, apiKey }, prompt, stream);
        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
```

`src/routes/api/edit-image.ts` uses the same route structure; its POST handler is:

```ts
const apiKey = process.env["LOVABLE_API_KEY"];
if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
const form = await request.formData();
const upstream = await editImage({ ...imageSettings, apiKey }, form);
return new Response(upstream.body, {
  status: upstream.status,
  headers: {
    "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    "Cache-Control": "no-cache",
  },
});
```

Import `editImage` from the same server-only module. Pass `upstream.body` directly through, including error statuses. Do not parse the first event, buffer the stream, inject custom events or wrap the response in another `ReadableStream`.

Copy [stream-image.ts](knowledge://skill/ai-apps-image-generation/examples/stream-image.ts) into `src/lib/stream-image.ts`. Install `eventsource-parser`. For generation call `streamImage("/api/generate-image", { prompt }, onFrame)`; for editing pass the upload `FormData`. In `onFrame`, update the displayed image and final flag. Apply `blur-2xl` while partial and `blur-0` on completion, with `transition-[filter]`.

Add loading and error state around the call. When the user requests a Stop control, pass its AbortController signal to the client helper. In the corresponding server route, pass `request.signal` as the fourth argument to `generateImage` or the third argument to `editImage`. Wrap that call in try/catch: if `request.signal.aborted` or the caught error is an `AbortError`, return `new Response(null, { status: 499 })`; rethrow other errors. Do not add timeouts or cancellation on navigation/unmount unless requested. Without a Stop control, keep the signal-free route above. Follow [streaming cancellation](knowledge://skill/ai-apps-image-generation/references/streaming.md).

For prompt enhancement plus generation, keep two endpoints: a `createServerFn` for non-streaming enhancement and the image server route. Await enhancement in the client, then start generation. Do not combine both into a custom buffered SSE protocol.
