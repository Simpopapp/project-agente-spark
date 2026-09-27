---
name: lovable-image-gen
description: Generate images with AI exactly like the Lovable agent does (Lovable AI Gateway, model openai/gpt-image-2.5-sunburst, OpenAI Images format). Use whenever asked to create, generate or draw an image, photo, illustration, logo or banner.
---

# Lovable image generation

Same path as the Lovable agent's image tool: POST `https://ai.gateway.lovable.dev/v1/images/generations`,
model `openai/gpt-image-2.5-sunburst`, auth `LOVABLE_API_KEY` (never print it).

## Steps
1. Write a rich, specific prompt (subject, style, lighting, composition, colors).
2. Pick quality: `fast` (default), `standard` (more detail), `premium` (text/typography in the image).
3. Pick size 512–1920 per side (e.g. 1920x1080 for banners, 1024x1024 square).
4. Save inside the project: images the app shows go to `src/assets/`; test images to `public/agent-demo/`. Use `.jpg` for photos.
5. Run:
   ```bash
   python3 .opencode/skills/lovable-image-gen/scripts/gen_image.py "PROMPT" --output src/assets/name.jpg --width 1024 --height 1024 --quality fast
   ```
6. Confirm the JSON line `{"ok": true, ...}` and that the file exists with non-zero size.

## Errors
- 402: out of AI credits — stop and report. 403: access blocked — stop and report.
- 429/5xx: the script already retries twice; if it still fails, report.
- 400: fix the request (size/prompt), don't resend unchanged.
