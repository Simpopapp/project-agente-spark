# Streaming image responses

## Generation time — no artificial deadlines

A request takes as long as the model needs: routinely tens of seconds, and minutes at large sizes or high quality settings (actual latency depends on the model and parameters). Do not wrap the Gateway fetch in `AbortSignal.timeout(...)`, an `AbortController` armed by a timer, or a `Promise.race` deadline — a timer shorter than real generation time aborts work that still completes and bills, and the user gets nothing. If an overall deadline is truly unavoidable, set it to a large multiple of the worst case (minutes, not seconds). When the hosting platform enforces an execution limit of its own, keep `stream: true` (flowing bytes keep the connection alive once events start) and show progress with partial frames, or move the call into a background/deferred task — never add a shorter timer of your own.

# Errors

Retryability and recovery per status follow `ai-gateway-error-semantics`: only 429/5xx retry, with bounded backoff; every other status is terminal. Moderation rejections below are terminal 400s — fix the prompt, never auto-retry.

# Content moderation

OpenAI image models (`openai/gpt-image-*`) return `error.code: "content_policy_violation"` (sometimes `"moderation_blocked"`) for prompts that name copyrighted characters (Marvel, DC, Disney, Nintendo, specific anime franchises), real identifiable people, or other restricted content. When this happens, tell the user the prompt was rejected and suggest one of: a non-IP descriptive variant (`"a red and gold high-tech armored hero"` instead of `"Iron Man"`), switching to a Gemini image model (different policy — may accept what OpenAI rejects, or vice versa), or the agent-side `generate_image` tool if the asset is going into the project. Do not silently rephrase the prompt and retry to evade the filter.

With `stream: true`, the moderation check usually fires late in generation — earlier `image_generation.partial_image` events deliver partial PNGs that render successfully, and the failure arrives as a terminating `error` event (or, rarely, the stream just ends without an `image_generation.completed`). A rendered partial frame is **not** a success signal: handle `error` by surfacing `error.message`, and treat a stream that ends without a completed event (`image_generation.completed`, or `image_edit.completed` on the edits route) as a failure too.

# Read until the HTTP body ends — not on heuristics

Keep the client SSE reader looping until `reader.read()` returns `done: true`. Do not abort early on heuristics like `partial_image_index === undefined && b64_json !== undefined` or `finish_reason === "stop"` — there can be trailing bytes (the `image_generation.completed` event itself, SSE comment heartbeats, or the OpenRouter `[DONE]` sentinel for Gemini) after the visible final image. Use the completed event (`image_generation.completed` / `image_edit.completed`) only to flip a UI flag (e.g. remove blur on partial frames).

# Cancellation — user-initiated only

User cancellation is the only sanctioned early exit from the read loop above. Forward an abort signal into the Gateway fetch only when the user has an explicit stop/cancel control; do not pass `request.signal` — or any signal that fires on unmount, navigation, or a timer — into the fetch unless the user explicitly asked for cancellation on that trigger. When a signal is forwarded, wrap the fetch and the stream read in try/catch: an `AbortError` after the user cancels is the expected outcome — return `new Response(null, { status: 499 })` rather than letting it surface as a 500. Cancelling frees the connection; the upstream generation may still complete and bill, so cancellation is a UX affordance, not a cost control.

# Response shape

Selected by the `stream` field in the request. The Gateway normalizes responses across providers, so the event/payload shape under each transport is identical for OpenAI and Gemini models.

## Streaming

Selected by `stream: true` in the request. The transport is Server-Sent Events. The 200 header and `Content-Type: text/event-stream` arrive immediately; the first event arrives only once the model produces output, which can be most of the generation time. A stream that is silent after headers is working, not dead — keep reading, and do not add a first-event timeout. The backend route forwards the Gateway's SSE body to the client without parsing; the client parses events and renders each one to the UI. These event types arrive:

- `image_generation.partial_image` — a preview frame. Emitted only when `partial_images > 0` is sent in the OpenAI request body (Gemini emits partials natively as it renders). `b64_json` is a complete PNG; render it as `data:image/png;base64,${b64_json}`. Multiple of these arrive in order (`partial_image_index` 0, 1, 2, …); each supersedes the previous preview. **Apply a CSS blur to partial frames** — e.g. swap a className based on the `isFinal` flag from the parser (`partial` → `filter: blur(16px)`, `final` → `filter: none`). Without the blur, users see fully-rendered intermediate images flicker into the final image and the UI looks broken rather than progressive — the blur is what sells "this is still loading." Remove the blur on `image_generation.completed`.

  ```json
  {
    "type": "image_generation.partial_image",
    "created_at": 1713833628,
    "b64_json": "...",
    "partial_image_index": 0
  }
  ```

- `image_generation.completed` — the final image. Always emitted last on success. `b64_json` is the finished PNG; render the same way and treat it as terminal.

  ```json
  {
    "type": "image_generation.completed",
    "created_at": 1713833630,
    "b64_json": "...",
    "usage": { "input_tokens": 50, "output_tokens": 100, "total_tokens": 150 }
  }
  ```

- `error` — the request failed (moderation block, invalid model, rate limit, upstream error). It is terminal and replaces `image_generation.completed`; no image follows. Surface `error.message` to the user (e.g. set an error state and stop the loading UI) rather than waiting for a completed event that won't come. It can arrive on an HTTP 200 stream — the Gateway opens the stream before the upstream responds so a slow first event isn't dropped, so a non-2xx outcome can only travel as an in-band event, not an HTTP status.

  ```json
  {
    "type": "error",
    "error": { "message": "...", "type": "upstream_error", "code": "content_policy_violation" }
  }
  ```

  Treat a terminal frame whose payload `type` is `"error"` the same way: some providers (OpenAI) emit a native `{"type":"error","error":{…}}` frame that the Gateway forwards verbatim instead of the named `error` event. Detect failure by **either** the event name `error` **or** `payload.type === "error"`, and surface `error.message` in both cases.

If `partial_images` is omitted or `0` on an OpenAI request, only the final `image_generation.completed` event arrives and there is nothing to render progressively — set `partial_images >= 1` for OpenAI when previews matter.

Recover once when a stream ends or its body read fails with **zero events** — no partial, no completed, no `error`. Catch the read rejection before entering the fallback; a `finally` block alone does not reach code after a rejected read. Replay the same request with `stream` omitted: same endpoint, model, prompt, and input images, then read `data[0].b64_json` from the JSON response. Preserve explicit user cancellation (`AbortError`, or an aborted signal when a Stop control is wired): stop without replaying. A stream that delivered an image or provider error must not trigger another generation. If the buffered replay also has no image, surface the failure and inspect the response and model's request format; an empty result alone does not prove the body shape was wrong.

Read [stream-image.ts](knowledge://skill/ai-apps-image-generation/examples/stream-image.ts) for the shared React client parser. It supports JSON generation requests and multipart edit requests, preserves all inputs on the single zero-event replay, handles both event-name pairs, and flushes each preview before the next event in a coalesced chunk. Install `eventsource-parser`. Apply blur to partial frames and remove it on completion.

The backend must honor `stream: false` (or the multipart string `"false"`) by omitting both `stream` and `partial_images` upstream and forwarding the JSON response. Forward the live SSE body directly without parsing or buffering it.

For a non-streaming job, read `data[0].b64_json`. Use this only when no client needs previews and the execution budget comfortably exceeds generation time, or the user explicitly asks for non-streaming. Store large image bytes and give agent loops a URL or reference rather than base64.

For timeout and cancellation diagnosis, follow [ai-apps-gateway-no-artificial-timeouts](knowledge://skill/ai-apps-gateway-no-artificial-timeouts/SKILL.md).
