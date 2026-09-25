# Building image prompts in app code

Use these prompt construction patterns with the selected image model.
Construct the request's `prompt` from the app's current form values and visual
requirements.
Keep example copy as editable defaults, not hardcoded request content.

1. Describe the image's purpose, subject, composition, placement, medium,
   materials and lighting. Translate mood into visible details while retaining
   the user's brief.
2. Quote user-entered text verbatim, with placement, typography and occurrence
   count. Include requested exclusions. For text baked into the image, send
   these requirements to the model rather than relying on a UI overlay.
3. Separate requested edits from what must remain unchanged: identity, product
   geometry, colors, labels, layout, lighting or camera angle, as applicable.
4. Assign each reference a role in the prompt, matching its actual input order.
   For OpenAI edits, preserve that order when appending `image[]` file parts;
   state which source details to retain and which reference elements to borrow.
5. For a follow-up edit, send the previous result as an image input, request the
   change and restate critical preservation constraints. Let the user inspect
   exact text and unintended changes before another edit.

Set dimensions, quality and transparency through the supported API fields
accepted by the selected model; prompt text alone does not configure those fields.
Source: [OpenAI image prompting](https://developers.openai.com/api/docs/guides/image-prompting).
