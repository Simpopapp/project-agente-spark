# Image requests

Read the co-loaded `ai-gateway-models` knowledge for the resolved default model, its request format and the gateway base URL. Set those as server-side constants in the generated app. Never copy a placeholder model into working code. The format is one of `openai`, `gemini-chat`, or `generate-content`; some Google models use the third format, so a provider-prefix check is insufficient.

For a non-default model, first confirm its exact ID and input/output modalities in authenticated `GET /v1/models`. Apply the matching request contract below only after discovery:

| Discovered model family | Request format |
| --- | --- |
| OpenAI image models | `openai` |
| Gemini 3 Pro Image or Gemini 3.1 Flash Image | `gemini-chat` |
| Gemini 3.1 Flash Lite Image, spicy-mayo or instant-ramen | `generate-content` |
| Lovable image-fast, image-standard or image-premium aliases | `openai` |
| Lovable image-edit alias | `gemini-chat` |

Lovable aliases use `/v1/images/generations` only; fast and standard default to `quality: "low"`, premium to `"medium"`, and explicit quality values win. Check `modalities.input` before implementing edits: instant-ramen accepts text/video, not image uploads. For a model without a documented request contract, confirm its provider format before implementing a switch.

Read [gateway-request.ts](knowledge://skill/ai-apps-image-generation/examples/gateway-request.ts). Copy the needed helper into a server-only module and supply `ImageConfig` from those constants and the server's `LOVABLE_API_KEY`. It contains separate generation and editing requests, without coupling them to a framework.

| Format | Generation body |
| --- | --- |
| `openai` | `model`, `prompt`, `stream: true`, `partial_images: 1` |
| `gemini-chat` | `model`, `messages: [{role: "user", content: prompt}]`, `modalities: ["image", "text"]`, `stream: true` |
| `generate-content` | `model`, `contents: [{role: "user", parts: [{text: prompt}]}]`, `generationConfig: {responseModalities: ["TEXT", "IMAGE"]}`, `stream: true` |

Use the workspace default unless the user requests a different available model. For new code or a model switch, use the matching recipe above and remove incompatible fields. Never combine `prompt` with `messages`. Gemini chat accepts neither OpenAI `quality` nor `partial_images`; native Vertex requests use `contents`. The image endpoint also translates compatible `prompt` or `messages` bodies for Vertex-backed models, so preserve working existing requests during unrelated edits. It normalizes image results to the same `b64_json` payload and SSE events. The client parser stays the same.

Add user-requested size, quality, transparency or aspect ratio in the selected provider's supported API fields; read [provider parameters](knowledge://skill/ai-apps-image-generation/references/parameters.md) for valid values. Do not add a local validator that rejects provider options. `response_format` is not an image parameter. For small avatars, request a supported resolution and downscale. For transparent output, first check the selected model's support; do not send `background` to a model that rejects it.

New interactive flows stream by default. A zero-event replay must use the same configured model and input, omitting `stream` and OpenAI's `partial_images`. Keep explicit user settings intact on replay.

Read [editing](knowledge://skill/ai-apps-image-generation/references/editing.md) for uploads, [streaming](knowledge://skill/ai-apps-image-generation/references/streaming.md) for the response parser, and the matching [TanStack](knowledge://skill/ai-apps-image-generation/references/tanstack.md) or [Classic](knowledge://skill/ai-apps-image-generation/references/classic.md) backend reference. For an existing chat-completions image flow, read [legacy guidance](knowledge://skill/ai-apps-image-generation/references/legacy-chat-images.md) before changing it.
