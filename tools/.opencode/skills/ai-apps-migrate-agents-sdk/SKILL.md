---
name: ai-apps-migrate-agents-sdk
description: Legacy Lovable Agents SDK migration guidance for projects whose current files include lovable/agents/<agent-name>/index.ts, lovable/agents/*, or @lovable/agent-sdk, even if the user only says the agent is broken, failing, not deployed, or needs a fix. Select this only when those files/dependencies are present or the user explicitly asks to migrate from Lovable Agents SDK. Explains how to migrate legacy Lovable Agents SDK agents to AI SDK implementations using Lovable AI Gateway instead of repairing the old custom-agent runtime. Include ai-sdk-lovable-gateway and the stack-specific connecting-to-models file with this file. Do not select this for ordinary AI agent docs, tool-catalog overload, tool deferral, MCP setup, or new AI SDK agent work when legacy Lovable Agents SDK files/dependencies are not present. Do not select this when the user explicitly asks to keep, repair, or extend the legacy custom-agent runtime instead of migrating.
---

# Migrating from Lovable Agents SDK

Some projects contain legacy custom agents built with the Lovable Agents SDK. These were defined under `lovable/agents/<agent-name>/index.ts` and provisioned as Lovable custom agents.

For new work, migrate these agents to AI SDK server-side implementations that use Lovable AI Gateway. Treat requests to fix, debug, update, or modernize a broken `lovable/agents/*` agent as migration work unless the user explicitly asks to keep the legacy runtime. Do not create or provision new `lovable/agents/*` custom agents.

## Detection

A project has legacy Lovable Agents SDK agents when it contains files matching:

```txt
lovable/agents/<agent-name>/index.ts
```

Inspect every matching agent folder before changing behavior. Each `index.ts` usually contains an `agent({ ... })` definition and may import tools, tool arrays, skills, or helper functions from nearby files.

## Migration Target

Pick the target stack first:

| Project stack | Use |
| --- | --- |
| Classic Lovable stack with Supabase | `connecting-to-ai-models-classic-stack` |
| New TanStack Start stack | `connecting-to-ai-models-tanstack` |

Use `ai-sdk-lovable-gateway` for the shared provider helper that connects the AI SDK to Lovable AI Gateway. Do not duplicate that provider setup here.

Before writing any migrated model call, create or reuse the shared `createLovableAiGatewayProvider` helper from `ai-sdk-lovable-gateway`. Do not migrate agents into direct `fetch` calls, raw OpenAI-compatible payloads, or inline provider setup.

## What To Preserve

Move the agent's behavior, not the old runtime wrapper.

| Legacy field/pattern | Migrate to |
| --- | --- |
| `instructions` | AI SDK `system` prompt in `streamText` / `generateText` |
| `tools` using `defineTool` | AI SDK `tool({ description, inputSchema, execute })` |
| `params` Zod schema | AI SDK `inputSchema` |
| tool implementation body | AI SDK `execute` function |
| `inputSchema` | request validation before calling the model, or structured input parsing in the route |
| `systemTools` | cannot be migrated; ignore them unless the app already has an explicit safe equivalent in normal app/server logic |
| `skills` | merge relevant skill instructions into the server-side `system` prompt or app docs; do not keep a runtime skill loader unless the app needs one |
| `onMessage` / `conversation.beforeMessage` | request preprocessing before `streamText` |
| `onSpawn` / `config` / `conversation.config` | route-level initialization, constants, or server-only config |
| `endpoints` | normal app API/server routes |

Preserve the agent name, description, tone, system prompt, and tool semantics. Do not preserve deployment/provisioning code that only existed for the old custom-agent runtime.

## Migration Process

1. Find all `lovable/agents/*/index.ts` files.
2. For each agent, read `instructions`, `tools`, `inputSchema`, `systemTools`, `skills`, and lifecycle hooks.
3. Create or reuse the shared Lovable AI Gateway provider helper from `ai-sdk-lovable-gateway`.
4. Create the target server route/function following the stack-specific knowledge file.
5. Move the `instructions` text into the AI SDK `system` prompt.
6. Convert each `defineTool` into an AI SDK `tool`.
7. Convert each tool `params` schema into `inputSchema`.
8. Move each tool's useful work into `execute`; keep side effects server-side.
9. Use `streamText` for chat/assistant flows, `generateText` for one-shot calls (on a ✓ Responses model always `streamText` — see `ai-responses-api`), and AI SDK `Output` for structured results.
10. Update the frontend to call the new route/function and render AI SDK message parts.
11. Delete the migrated `lovable/agents/<agent-name>/` folder after the new route works and no runtime imports depend on it.
12. Remove references to old custom-agent provisioning once the app uses the new route.

## Tool Conversion Shape

Legacy tools often look conceptually like:

```ts
defineTool({ name, description, params, handler })
```

Convert to:

```ts
tool({ description, inputSchema, execute })
```

Use the existing tool name as the key in the AI SDK `tools` object. Keep descriptions concise and preserve parameter descriptions where they guide model behavior.

Tool migration rules:
- Keep tools narrow; split broad tools when the original schema mixed unrelated actions.
- Keep tool results compact and serializable.
- Do not pass large blobs such as base64 images back to the model.
- Use `needsApproval` for tools that mutate data, spend money, send messages, execute commands, or make irreversible changes.
- Do not migrate `systemTools`. It is fine to ignore them; only replace one when the app already has an explicit safe equivalent in normal app/server logic.

## Prompt Migration

Treat `instructions` as the primary system prompt. If the old agent used skills, add only the relevant parts to the prompt. Do not dump entire large skill files into every request unless the app genuinely needs them.

Keep prompts server-side. The client should send user input/messages, not system prompts or tool definitions.

## Choosing The New Runtime

For chat-style agents:
- Use AI SDK UI on the client.
- Use `streamText` on the server.
- Return the AI SDK UI message stream response.
- Render `message.parts` in the frontend.

For extraction/classification agents:
- Use `generateText` or `streamText` with AI SDK `Output` schemas.
- Do not ask the model to return JSON and parse it manually.

For multi-step agents:
- Use AI SDK tools with `stopWhen`.
- Keep the loop bounded with `stepCountIs(50)` or higher. Do not set `stepCountIs` below 50.
- Use stack-specific guidance for Classic/Supabase or TanStack route wiring.

## Cleanup

After migration, the app should no longer depend on `@lovable/agent-sdk`, `@lovable/agents-sdk`, or files under `lovable/agents/*` for runtime behavior. Do not leave the migrated `lovable/agents/<agent-name>/` folder in place because Lovable may continue treating it as a legacy custom agent.

Remove:
- the migrated `lovable/agents/<agent-name>/` folder;
- unused `@lovable/agent-sdk` / `@lovable/agents-sdk` package dependencies;
- old agent SDK client helpers, hooks, aliases, and imports once the frontend calls the new AI SDK route/function;
- stale UI or config that pointed to provisioned custom agents.
