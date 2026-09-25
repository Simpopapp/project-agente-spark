# Existing legacy chat-completions image generation

For new image generation code, use `/v1/images/generations`, and write its body from the selected request format in [request-formats.md](knowledge://skill/ai-apps-image-generation/references/request-formats.md) — do not copy an existing `/v1/chat/completions` request body and swap the URL; derive the body for the chosen model from scratch.

If the project already has working image generation implemented through `/v1/chat/completions`, keep that existing pattern when making unrelated changes or small fixes. Do not migrate it to `/v1/images/generations`, remove chat-style fields, or rewrite response handling just because the current recommended API is the dedicated image endpoint.

When editing a legacy `/v1/chat/completions` image request body, keep it inside this contract: a non-empty `messages` array, and — when `modalities` is present — exactly `["image", "text"]`. Do not add a `prompt` field next to `messages` (the instruction text goes in a user message), do not set `n` (make one request per image), and do not request any other `modalities` values such as `["text"]` or `["image"]` (an image model always returns image plus text).

Only migrate legacy chat-completions image generation when the user explicitly asks for a migration, when adding a brand-new image generation flow with no existing project pattern, or when the existing legacy path is the direct cause of the bug being fixed.
