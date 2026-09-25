# Uploaded images and edits

Use the resolved default image model when the user has not selected another. Read [request formats](knowledge://skill/ai-apps-image-generation/references/request-formats.md) and [gateway-request.ts](knowledge://skill/ai-apps-image-generation/examples/gateway-request.ts) before wiring the edit route. Read [prompt construction](knowledge://skill/ai-apps-image-generation/references/prompting.md) when identity, exact text or reference roles matter.

For OpenAI models, POST multipart `FormData` to `/v1/images/edits`. Use `image` for one file or append ordered `image[]` parts for multiple references. Add `prompt` and `model`; pass supported user settings such as `quality`, `background`, `size`, `n` and `output_format` as form fields. Preserve their values. A `mask` is a PNG whose fully transparent pixels mark editable regions and whose dimensions match the first image. The gateway drops `service_tier` and sets `user` itself; other fields receive upstream validation. Do not send unsupported fields such as `input_fidelity` on GPT Image 2.

Let `fetch` set the multipart boundary. Upload the file bytes, not a base64 string disguised as a file. The OpenAI JSON generations endpoint has no input-image field.

For Gemini chat, send the instruction and `image_url` data-URL parts in a user message on `/v1/images/generations`. For `generate-content`, use text and `inlineData` parts containing MIME type and raw base64 without a data-URL prefix. Preserve reference order when encoding images. Lovable image tier aliases use generations only; use the edit tier's request format from [request formats](knowledge://skill/ai-apps-image-generation/references/request-formats.md).

The browser posts the same upload to its backend route:

```ts
const form = new FormData();
form.append("prompt", instruction);
for (const image of referenceImages) form.append("image[]", image);
await streamImage("/api/edit-image", form, (src, isFinal) => {
  setImage(src);
  setIsFinal(isFinal);
});
```

Read [stream-image.ts](knowledge://skill/ai-apps-image-generation/examples/stream-image.ts) for that client helper. It accepts both `image_generation.*` and `image_edit.*` events and replays the same multipart files and fields once with `stream: "false"` only after a zero-event stream. Never replace this upload replay with a JSON prompt-only request.

For follow-up refinements, send the previous output as an image input and restate what must stay unchanged. For models without a fidelity control, put preservation constraints in the prompt and use a mask for localized OpenAI edits.
