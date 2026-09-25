---
name: ai-apps-sdk-tool-deferral
description: Overload mitigation for agents with too many tools. Select this only when the request explicitly asks to keep agent context light, mentions slow/expensive turns or AI gateway 500s caused by many tools, requests deferral/meta-tool architecture, or connects more than a handful of integrations to one runtime agent. Do not select for connector setup, MCP setup, single-service tool access, high-level service-tool access, API primitive documentation, ordinary function calling, step-limit choices, generic AI app requests, small fixed tool lists, direct/eager registration, non-meta-tool architectures, direct tool exposure for debugging, non-AI-SDK runtimes, or projects that reject meta-tool indirection unless the project already follows the deferral pattern.
---

# Tool deferral for AI agents (AI SDK)

AI agents and AI apps built in Lovable risk loading too much tool context up
front when many tools, MCP servers, or service integrations are connected to
a single agent. Registering every tool descriptor on every turn inflates the
input token count, can saturate the context window, and has been observed to
trigger AI gateway 500s on tool-heavy agents.

Default behavior: when an agent exposes many tools or runtime MCP connections
with large or user-variable catalogs, defer tool registration. Expose only a
small set of meta-tools to the model and resolve real tools on demand. Keep
this off for small fixed tool lists or when the user explicitly asks for
direct/eager registration.

## When to apply

Apply deferral by default when any of the following is true for the agent:
- More than a handful of tools (rule of thumb: roughly eight or more
  descriptors once you count MCP tools, app integrations, and built-ins).
- Runtime MCP connections with large or user-variable tool catalogs.
- Multiple connected services per user, where the set of tools varies
  between users.
- The user mentions context bloat, slow turns, gateway errors, or
  "too many tools" symptoms.

Skip deferral and register tools directly when the user explicitly asks for
it, when there are only a few static tools, when debugging tool wiring, or
when the user wants a custom non-AI-SDK runtime.

## Meta-tool pattern

Expose two meta-tools to the model instead of the full tool catalog:

| Meta-tool | Purpose |
| --- | --- |
| `tool_search` | Find tools by keyword. Optional `server` filter for MCP/integration name. Returns name, description, and a compact input schema preview. |
| `tool_invoke` | Run a tool by its exact name with a JSON arguments object. Validates arguments against the resolved tool's schema and returns the tool result. |

Define the meta-tools with the AI SDK `tool` helper and narrow Zod input
schemas. Implement them on top of a tool registry that loads the full
catalog from your normal sources (app tools, MCP clients, integrations)
but does not register that catalog with the model.

```ts
// src/server/tool-registry.server.ts
type ToolDescriptor = {
  name: string;        // namespaced, e.g. "workspace.create_item"
  server: string;      // "workspace", "repository", "app", ...
  description: string;
  inputSchema: unknown; // JSON Schema for tool_invoke validation
  execute: (args: unknown) => Promise<unknown>;
};

export async function loadToolRegistryForUser(userId: string): Promise<{
  descriptors: ToolDescriptor[];
  close: () => Promise<void>;
}> { /* load eager + MCP + integration tools, return close() */ }
```

Then build the meta-tools from the registry:

```ts
import { tool } from "ai";
import { z } from "zod";

export function buildMetaTools(registry: ToolDescriptor[]) {
  return {
    tool_search: tool({
      description:
        "Search available tools by keyword. Use this before invoking any external tool.",
      inputSchema: z.object({
        query: z.string().describe("Keyword(s) to match in tool name/description"),
        server: z.string().optional().describe("Optional server/integration name"),
        limit: z.number().int().min(1).max(20).default(8),
      }),
      execute: async ({ query, server, limit }) => {
        const q = query.toLowerCase();
        const matches = registry
          .filter((t) => !server || t.server.toLowerCase() === server.toLowerCase())
          .filter((t) =>
            t.name.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q),
          )
          .slice(0, limit)
          .map((t) => ({
            name: t.name,
            server: t.server,
            description: t.description,
            input_schema: t.inputSchema,
          }));
        return { matches };
      },
    }),
    tool_invoke: tool({
      description:
        "Invoke a tool by exact name with JSON arguments. Discover names via tool_search first.",
      inputSchema: z.object({
        name: z.string(),
        arguments: z.record(z.string(), z.unknown()).default({}),
      }),
      execute: async ({ name, arguments: args }) => {
        const t = registry.find((d) => d.name === name);
        if (!t) return { error: `Unknown tool: ${name}` };
        return await t.execute(args);
      },
    }),
  };
}
```

## Eager vs deferred

Keep a small set of tools eager (registered directly with `streamText`)
when they are needed every turn, have tiny schemas, or are core to the
agent's identity (for example a short list of app-defined tools the agent
always uses). Defer everything else through the meta-tools.

```ts
// src/routes/api/chat.ts
const eagerTools = buildEagerAppTools(ctx);
const { descriptors, close } = await loadToolRegistryForUser(userId);
const metaTools = buildMetaTools(descriptors);

const result = streamText({
  model: lovableGateway("openai/gpt-5.5"),
  messages,
  tools: { ...eagerTools, ...metaTools },
  stopWhen: stepCountIs(50),
  onFinish: async () => { await close(); },
});
```

## System prompt note

When deferral is on, tell the model that external tools exist but are not
loaded up-front. Add a short section to the system prompt:

```
External tools:
- You have access to tools from connected services (and any configured MCP
  servers) but they are NOT loaded up-front to keep your context light.
- Use `tool_search` to find the right tool by keyword. You can also filter
  by `server` (for example `tool_search({ server: "workspace", query: "item" })`).
- Then call `tool_invoke` with the exact tool name and a JSON arguments
  object to run it.
- When the user mentions a service by name, search that server first.
```

Do not list the full tool catalog in the prompt; that defeats deferral.

## Combining with MCP

When the agent uses `ai-apps-sdk-mcp-client`, fold each MCP server's
`client.tools()` output into the registry instead of merging it directly
into the `tools` argument of `streamText`. Namespace tool names by server
(for example `workspace.create_item`) so `tool_search`'s `server` filter is
meaningful and collisions across servers cannot happen. Close every MCP
client after the response stream finishes (this is unchanged from the
`ai-apps-sdk-mcp-client` skill).

## Acceptance checks

Before finishing, verify:
- The model sees only the eager tools plus `tool_search` and `tool_invoke`
  in its tool list when many tools are connected.
- `tool_search` returns useful descriptors for queries by keyword and by
  `server`.
- `tool_invoke` validates arguments against the resolved tool's schema and
  returns errors for unknown tool names.
- Input tokens per turn drop versus eager registration on the same agent
  with the same tool set (measure with the AI SDK provider response usage
  or the gateway logs).
- Tool calling still works end-to-end: search, invoke, and a normal
  multi-step `stopWhen` loop complete without regressions.
- MCP clients still close after the stream finishes.
