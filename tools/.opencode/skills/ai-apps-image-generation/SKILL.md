---
name: ai-apps-image-generation
description: >-
  Implementation and troubleshooting for image generation and image editing
  features in apps using Lovable AI Gateway. Relevant when fixing failed,
  stuck, timed-out or cancelled image generation, including client-side
  timeouts, AbortController, empty streams and retry behavior; or building
  text-to-image features, product photo editors, character art generators
  (including stylized 3D characters for movies), posters, portraits, banners,
  avatars, transparent stickers or thumbnails from uploaded video.
  Includes request recipes for GPT Image, Gemini / Nano Banana, Spicy Mayo
  and Instant Ramen; model switches; exact-text prompts; ordered image
  references; TanStack and Supabase backends; streaming previews; cancellation;
  and provider parameters. Also relevant when comparing
  image models available inside an app with the agent's generate_image and
  edit_image tools used to create project assets or standalone images.
---

# Image generation in apps

Use the co-loaded `ai-gateway-models` knowledge for the workspace's default model, default image request format, gateway base URL and authenticated model discovery. Use `ai-gateway-error-semantics` for retryability. Choose only the resolved default or an exact ID from the live listing; model-specific recipes below do not establish workspace availability.

Read the references needed for the task with `code--view`:

| Task | Reference |
| --- | --- |
| New generation or a model switch | [Request formats](knowledge://skill/ai-apps-image-generation/references/request-formats.md) and [server request examples](knowledge://skill/ai-apps-image-generation/examples/gateway-request.ts) |
| TanStack Start backend | [TanStack routes](knowledge://skill/ai-apps-image-generation/references/tanstack.md) |
| Classic / Supabase backend | [Edge Functions](knowledge://skill/ai-apps-image-generation/references/classic.md) |
| Streaming, previews, failures or cancellation | [Streaming and recovery](knowledge://skill/ai-apps-image-generation/references/streaming.md) and [client parser](knowledge://skill/ai-apps-image-generation/examples/stream-image.ts) |
| Size, quality, transparency or aspect ratio | [Provider parameters](knowledge://skill/ai-apps-image-generation/references/parameters.md) |
| App image APIs versus agent image tools | [Image surfaces](knowledge://skill/ai-apps-image-generation/references/surfaces.md) |
| Uploaded images, masks or multiple references | [Editing](knowledge://skill/ai-apps-image-generation/references/editing.md) |
| Exact wording, composition or preserving source details | [Prompt construction](knowledge://skill/ai-apps-image-generation/references/prompting.md) |
| Existing `/v1/chat/completions` image code | [Legacy image flows](knowledge://skill/ai-apps-image-generation/references/legacy-chat-images.md) |

Call the gateway server-side with `LOVABLE_API_KEY`. For new interactive flows, default to `stream: true`, forward the SSE body directly, render each partial preview with blur, and remove blur on completion. TanStack uses a server route, because `createServerFn` cannot carry the image stream or multipart upload.

Read the parser before implementing streaming. Keep reading until the HTTP body ends; partial frames are not success. Only a stream with zero image/error events may replay once without streaming, preserving the endpoint, model, prompt and uploaded files. Explicit cancellation never replays. Do not add timer-driven aborts or first-event deadlines.

When the user requests a Stop control, wire its signal through the client and server helpers to the gateway fetch, and handle expected server aborts as status 499. Without that control, omit signal forwarding.

For wider timeout diagnosis, follow [ai-apps-gateway-no-artificial-timeouts](knowledge://skill/ai-apps-gateway-no-artificial-timeouts/SKILL.md). Preserve a working legacy image flow during unrelated edits.
