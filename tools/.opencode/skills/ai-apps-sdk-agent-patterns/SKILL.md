---
name: ai-apps-sdk-agent-patterns
description: Named AI SDK primitive/API reference. Select this when the user explicitly names AI SDK primitives, asks when/why to choose or compose APIs such as generateText, streamText, tool, dynamicTool, stopWhen, stepCountIs, Output, or AI SDK error handling, or needs compact API-choice guidance for a simple model-backed feature. It may accompany a more specific AI SDK file when the request also needs primitive-level API choices, but specialized files own detailed chat UI/history, MCP connector setup, user-run cancellation, tool-catalog overload/deferral, or legacy migration. Default stack-specific connection guidance covers provider setup, server placement, and ordinary model routes. Do not select this for explicit custom provider APIs, alternate agent runtimes, hand-rolled streaming, or "no extra framework" requests unless the project already uses this stack.
---

# AI SDK core patterns

When building model-backed AI features, default to the AI SDK together with the Lovable AI Gateway provider. Do not hand-roll provider calls, SSE parsing, tool-call loops, or JSON parsing when the AI SDK has a native primitive for the job.

Before implementing, consult the current AI SDK docs in markdown:

| Need | Read |
| --- | --- |
| Full docs index | `https://ai-sdk.dev/docs/introduction.md` |
| Agent architecture | `https://ai-sdk.dev/docs/agents/building-agents.md` |
| Workflow patterns | `https://ai-sdk.dev/docs/agents/workflows.md` |
| Loop control | `https://ai-sdk.dev/docs/agents/loop-control.md` |
| Tool calling | `https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling.md` |
| Structured data | `https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data.md` |
| Basic chat UI transport | `https://ai-sdk.dev/docs/ai-sdk-ui/chatbot.md` |
| Chat tools UI reference | `https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage.md` |
| Chat persistence reference | `https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence.md` |
| Resumable streams reference | `https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-resume-streams.md` |
| Complete markdown corpus | `https://ai-sdk.dev/llms.txt` |

Use the docs for exact APIs and imports. The AI SDK changes over time, so do not guess current names or signatures from memory.

Default choices:

| User intent | AI SDK primitive |
| --- | --- |
| Simple one-shot generation | **Fast call (seconds):** `generateText`. **On `/v1/responses`**: `streamText` + `await result.text` (see `ai-responses-api`). **Any call that can run long** (reasoning enabled, multi-minute jobs): `streamText` + `await result.text` — buffered runs exceed request timeouts, still bill, and are auto-retried at full price (see `ai-sdk-lovable-gateway`) |
| Streaming chat or live assistant output | `streamText` plus `toUIMessageStreamResponse` |
| Basic conversational transport | `useChat`, `DefaultChatTransport`, and server-side `streamText` |
| Tools/function calling | `tool`, `inputSchema`, `execute`, and `stopWhen` |
| Dynamic/runtime tools | `dynamicTool` |
| Structured extraction/classification | `generateText` or `streamText` with `Output.object`, `Output.array`, or another `Output` schema |
| Streaming structured data | `streamText` with `output` and the documented structured stream helpers |
| Multi-step agent behavior | AI SDK agent docs, tool calling, and loop-control docs |

Implementation rules:
- Keep model calls, tools, and prompts on the server. The client sends user input and renders results.
- Use the Lovable AI Gateway provider helper for `model`; do not call provider APIs directly.
- Define tool inputs with schemas. Prefer Zod unless the app already uses another supported schema library.
- Give every tool a clear description and a narrow input schema. Tool results should be compact and serializable.
- Use `needsApproval` for tools that mutate data, spend money, execute commands, send messages, or make irreversible changes.
- Use `stopWhen` for multi-step tool loops. When using `stepCountIs`, set it to at least `stepCountIs(50)` for agent loops; do not use lower step limits. If structured output is combined with tools, account for the extra structured-output step.
- For structured output, use the AI SDK `Output` API instead of prompting the model to "return JSON" and parsing manually — but keep the schema small and constraint-free. When the schema is inherently large or dynamic, prompt for JSON and parse it instead, or split the call.

> CRITICAL: No `.min()`/`.max()`/length bounds, string `format`/`pattern`, long enums, or deep nesting in `Output`/tool schemas. When the user specifies limits ("at most 280 characters", "up to 5 points"), that is exactly the temptation: state the limits in the prompt text and clamp/validate the parsed result in code — never encode them as schema bounds. Never build an enum from unbounded runtime data. Constrained schemas fail two ways: Gemini rejects large ones at request time ("too many states"), and ANY model that exceeds an in-schema bound at generation time fails post-hoc validation with `AI_NoObjectGeneratedError: response did not match schema` — a runtime crash on an otherwise-successful gateway call. The guarded call is part of the same unit, never optional: catch with `NoObjectGeneratedError.isInstance(error)` and fall back to parsing `error.text` so malformed output degrades instead of crashing (full snippet in `ai-sdk-lovable-gateway`).
- On OpenAI models, `Output.object`/`generateObject` enforce the schema only when the provider is built with `{ structuredOutputs: true }`; otherwise it falls back to `json_object` and the schema is not enforced. See `ai-sdk-lovable-gateway` for the fix and the strict-schema field rules.
- For runtime MCP connector setup, use the `ai-apps-sdk-mcp-client` skill.
- For large tool catalogs, runtime MCP fanout, or tool-catalog overload mitigation, use the `ai-apps-sdk-tool-deferral` skill.
- For conversation history, thread/storage choices, thread routing, and message persistence, use the `ai-apps-chat-agent-ui-contract` skill. For building the visible chat UI surface — AI Elements composition and tool activity rendering — use the `ai-chat-ui-composition` knowledge entry.
- Surface errors from the server route to the UI. Handle rate limits, credit exhaustion, validation failures, and stream errors explicitly.

## Specialized ownership

This file only selects core AI SDK primitives and default implementation rules. Use the specialized entries for their domains:
- `ai-apps-chat-agent-ui-contract`: conversation history, thread/storage decisions, thread routing, and message persistence.
- `ai-chat-ui-composition`: the visible chat UI surface — AI Elements composition, the composer, message styling, tool-result rendering, and agent identity.
- `connecting-to-ai-models-tanstack`: TanStack Start server routes, `createServerFn`, Vite guardrails, and TanStack-specific file placement.
- `connecting-to-ai-models-classic-stack`: Classic/Supabase Edge Function wiring, client calls, and Classic-specific routing.
- `ai-apps-sdk-mcp-client`: runtime MCP connections, OAuth MCP, MCP URL discovery, connection storage, and MCP tool loading.
- `ai-apps-sdk-tool-deferral`: meta-tool deferral, tool search/invocation tools, and large or variable tool-catalog handling.
- `ai-apps-sdk-abort-cancel`: user-facing stop/cancel behavior and resumable/cancelled stream handling.
- `ai-apps-migrate-agents-sdk`: legacy `lovable/agents/*` and `@lovable/agent-sdk` migration.

If the docs recommend a newer pattern than this skill, follow the docs.
