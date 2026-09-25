# Image provider parameters

Apply these contracts to a model already selected from the workspace default or authenticated model listing. A model named here may be unavailable in this workspace. Model discovery and region restrictions come from `ai-gateway-models`; the listing does not expose these parameter schemas.

## OpenAI images

`size` accepts `auto` or `WIDTHxHEIGHT`. Prefer `1024x1024`, `1536x1024` or `1024x1536`. Custom dimensions must be multiples of 16, with aspect ratio between 1:3 and 3:1, neither edge above 3840 pixels, and 655,360–8,294,400 total pixels. Resolutions above `2560x1440` are experimental. `512x512` and `256x256` are below the minimum pixel count: generate at `1024x1024` and downscale for avatars, thumbnails or favicons.

For `openai/gpt-image-2`, omit `background`: the model rejects it and cannot produce transparent backgrounds. For a transparent asset, prompt for a plain solid background the app removes client-side and explain the limitation.

For an available `openai/gpt-image-2.5-flare` or `openai/gpt-image-2.5-sunburst`, generations and edits accept `quality` values `low`, `medium`, `high`, `xhigh`, `max`, `auto` and `background` values `auto`, `opaque`, `transparent`. For transparency, send `background: "transparent"` with `output_format: "png"` (the default) or `"webp"`; for maximum quality, send `quality: "max"`. The same size constraints apply.

Omit `response_format`: it is a rejected DALL-E-era parameter. Read the normalized image from `data[].b64_json` for JSON or the image SSE events when streaming. Set `partial_images` only on streaming OpenAI requests; remove it on a non-streaming replay.

## Gemini images

Omit OpenAI fields `size`, `background`, `quality` and `partial_images`. Gemini emits partial frames natively. Use the selected model's request family from [request formats](knowledge://skill/ai-apps-image-generation/references/request-formats.md).

For a discovered `google/spicy-mayo`, put image settings under `generationConfig.imageConfig`:

| Setting | Values |
| --- | --- |
| `imageSize` | `512`, `1K`, `2K`, `4K` |
| `aspectRatio` | `1:1`, `3:2`, `2:3`, `3:4`, `4:3`, `1:4`, `4:1`, `4:5`, `5:4`, `1:8`, `8:1`, `9:16`, `16:9`, `21:9` |
| `prominentPeople` | `BLOCK_PROMINENT_PEOPLE` blocks photorealistic prominent people |

Optional `generationConfig.thinkingConfig.thinkingLevel` accepts `MINIMAL`, `MEDIUM`, `HIGH`. Thinking parts are omitted from results. Image and video inputs use inline media.

For a discovered `google/instant-ramen`, output is 1 MP / 1K with aspect ratios from 1:4 to 4:1 set through `generationConfig.imageConfig.aspectRatio`. Its catalog accepts text and video input; use a model with image input for editing uploaded images.

Vertex image routes reject `outputMimeType` / `output_mime_type`; output is PNG. They strip `tools`, `toolConfig`, `systemInstruction`, `safetySettings`, `cachedContent` and `fileData`: search grounding and Google file references are unavailable. Send inline image media as described in [editing](knowledge://skill/ai-apps-image-generation/references/editing.md).

The gateway validates required `model` and boolean `stream`; provider parameter failures return the upstream status/message. Preserve user-requested supported options instead of adding a restrictive local validator. Follow `ai-gateway-error-semantics` for status handling.
