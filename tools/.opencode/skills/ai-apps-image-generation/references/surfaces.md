# Choose the image surface

For an app whose users generate or edit images at runtime, implement a server-side AI Gateway request with `LOVABLE_API_KEY`. Choose the workspace default or a model returned by authenticated `GET /v1/models` through `ai-gateway-models`; use [request formats](knowledge://skill/ai-apps-image-generation/references/request-formats.md) for implementation.

For creating an image for the user or a project asset during development, use the agent's `generate_image` or `edit_image` tool. These have a separate model catalog: `generate_image` offers `fast`, `standard` and `premium` tiers; `edit_image` has no model or tier parameter. Gateway model availability does not imply availability through these tools.

Save standalone images in Files (`/mnt/documents/`). Save images displayed or served by the app as project assets; add a Files copy only when requested. Follow an explicit destination.

When a model-availability question is ambiguous, distinguish runtime Gateway models from the agent's image tools. Fetch the workspace catalog for Gateway availability and describe the agent tool's own tiers without promising a Gateway model ID there.
