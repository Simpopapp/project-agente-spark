# Classic / Supabase Edge Functions

Read [request formats](knowledge://skill/ai-apps-image-generation/references/request-formats.md), [gateway-request.ts](knowledge://skill/ai-apps-image-generation/examples/gateway-request.ts), and [streaming](knowledge://skill/ai-apps-image-generation/references/streaming.md). Keep the gateway call in a Supabase Edge Function and read `LOVABLE_API_KEY` with `Deno.env.get`. Retain the project's existing authentication and CORS handling, including OPTIONS responses.

Copy the server helpers into a module shared by the image functions. Define and export `imageSettings: Omit<ImageConfig, "apiKey">` there with the actual gateway base URL, model and format from `ai-gateway-models` knowledge. In the generation function's authenticated POST handler:

```ts
const { prompt, stream = true } = await req.json();
const apiKey = Deno.env.get("LOVABLE_API_KEY");
if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500, headers: corsHeaders });
const upstream = await generateImage({ ...imageSettings, apiKey }, prompt, stream);
return new Response(upstream.body, {
  status: upstream.status,
  headers: {
    ...corsHeaders,
    "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    "Cache-Control": "no-cache",
  },
});
```

For editing, parse `await req.formData()` and call `editImage({ ...imageSettings, apiKey }, form)` from the same helper. Forward its body, content type and status using the same response code. Do not buffer or decode the upstream stream. Both helpers honor the non-streaming recovery flag.

Use browser `fetch` through [stream-image.ts](knowledge://skill/ai-apps-image-generation/examples/stream-image.ts) to consume the raw function response. Pass the function URL and the project's existing authentication headers through its optional `headers` argument. Never put `LOVABLE_API_KEY` in the browser. For an upload, let the helper derive the multipart content type.

Render each callback frame with blur while partial, then remove blur on completion. Show terminal errors. For a requested Stop control, pass its AbortController signal to the client helper, then pass `req.signal` as the fourth argument to `generateImage` or third argument to `editImage` in the Edge Function. Catch expected aborts and return status 499 with the CORS headers; rethrow other errors. Without a Stop control, omit signal forwarding. A platform execution limit is not a reason to add a shorter client timer; for jobs exceeding that platform budget use a background/deferred workflow.
