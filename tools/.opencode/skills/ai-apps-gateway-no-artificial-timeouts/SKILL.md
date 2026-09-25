---
name: ai-apps-gateway-no-artificial-timeouts
description: 'One rule: never wrap an AI Gateway call in an artificial client-side timeout. Select when adding or editing code that calls the Lovable AI Gateway (image generation, chat, reasoning, TTS, transcription, music, video) and a timeout, `AbortSignal.timeout`, `AbortController` + `setTimeout`, `Promise.race` deadline, or retry-on-slow wrapper is present or about to be added — and when debugging a Gateway call that times out, hangs, is cancelled, or returns nothing.'
---

# AI Gateway calls: no artificial timeouts

Generation takes as long as the model needs — routinely tens of seconds, and minutes for reasoning models, large or high-quality images, and media. A client-side timer that aborts the request discards work that still completes and bills.

- Never wrap a Gateway fetch in `AbortSignal.timeout(...)`, an `AbortController` armed by `setTimeout`, a `Promise.race` deadline, or an HTTP-client timeout option. If a deadline is truly unavoidable, set it to a large multiple of the worst case — minutes, not seconds.
- Prefer `stream: true` where the endpoint supports it — flowing bytes keep platform request timeouts from firing and let the UI show progress instead of a dead spinner.
- Abort only on an explicit user cancel action; catch the `AbortError` and return `new Response(null, { status: 499 })` — unhandled it surfaces as a 500.
- Await every Gateway fetch before a serverless function returns its response — a function that responds while the fetch is still in flight kills the generation mid-run.

For image streaming, per-model bodies and cancellation, follow [ai-apps-image-generation](knowledge://skill/ai-apps-image-generation/SKILL.md). Other endpoint rules live in `ai-responses-api`, `ai-text-to-speech`, and their endpoint knowledge files.
