---
name: ai-apps-sdk-mcp-client
description: 'MCP connector setup only. Select only when the request explicitly mentions MCP, remote MCP tools, OAuth MCP, or asks to connect a service''s remote tool catalog to an existing runtime agent, assistant, chatbot, or named AI persona so that persona can invoke those remote tools. Examples: "connect this service to my agent" or "give the assistant access to this service''s tools". Do not select unless both a runtime persona and remote service tools are in scope. Do not select for AI SDK tool/function-calling primitives, standalone model calls, ordinary model-powered features, app-to-service data imports/syncs, provider-specific OAuth/API connections, or chat/assistant UI without remote tool access. Do not select for a generic "add agent integrations (MCP)" or "enable agent integrations" request on the app — that means exposing the app AS an MCP server (app-mcp-server-authoring), not connecting remote tools to an in-app persona.'
---

# AI SDK MCP client support

When adding MCP support to a runtime AI agent, use the AI SDK MCP client. Do not use Cloudflare Agents MCP APIs.

Use this file only after confirming the app has, or is being given, a runtime AI agent, assistant, chatbot, AI companion, or named AI persona. Evidence can come from the current user request, project description, existing AI chat UI, AI SDK model route, or prior project context.

If the app does not have an AI agent/assistant/chatbot/persona, do not apply this MCP path. Let standard connector, OAuth, provider API, or integration knowledge handle ordinary app-to-service connections.

If the user asks to connect any SaaS app, developer tool, productivity tool, data source, or external tool source to an AI agent, treat that as runtime MCP tool support unless the project already has a different explicit integration path. The app's agent may be named instead of called "agent" or "assistant"; after confirming the name refers to the app's runtime AI persona, requests like "connect the research assistant to the workspace tool" mean connect the runtime AI agent to that service.

Once confirmed as runtime AI agent tool access, do not default to Lovable standard connectors or provider-specific OAuth/API integrations. Standard connectors authenticate the builder's Lovable account; they do not give each end user a runtime tool connection inside the generated app. Provider-specific OAuth can be a fallback only when no suitable remote MCP server exists or the user explicitly asks for native provider APIs.

Reference docs:
- `https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools`

Use `createMCPClient` from `@ai-sdk/mcp`. Prefer production HTTP transport:

```ts
const client = await createMCPClient({
  transport: { type: "http", url, authProvider, redirect: "error" },
});
```

Use SSE only when the MCP server requires it. Use stdio only for local-only MCP servers. Inspect the installed `@ai-sdk/mcp` package types/docs for the exact `OAuthClientProvider` interface before implementing it; do not guess method names.

Avoid these Cloudflare Agents APIs:
- `MCPClientManager`
- `routeAgentRequest`
- `DurableObjectOAuthClientProvider`
- Any Cloudflare Agents-specific MCP client or OAuth helper

## Before coding

Produce a short implementation plan naming the files, routes, and storage abstractions to touch. Identify the project auth mechanism and verify how authenticated server calls receive the current user's access token. Do this separately for raw `/api/chat` fetches and framework server functions; auth headers for one path do not automatically cover the other.

For a named service, research its current official remote MCP server URL and OAuth requirements before coding. Prefer official provider docs, the provider's MCP docs, or a service-maintained MCP directory. Do not invent MCP URLs. If no official remote MCP URL is available, ask the user for the MCP server URL or build the connection UI so they can paste it.

When an official remote MCP URL is found, include it in the implementation: prefill it in the connection UI, use it in the create-connection flow, or document it in the app's connection configuration. The user should not have to manually discover the URL when the provider publishes one.

When the service supports remote MCP with OAuth, build that OAuth MCP flow by default. Do not stop to ask the user to choose between manual tokens and provider-specific OAuth before attempting the MCP design.

## Connection registry

Persist MCP connections in the app's existing storage layer. Scope every read/write to the authenticated user or owner.

Store at least:
- `id`, `userId`/`ownerId`, `name`, `url`, `transport`
- `state`: `ready`, `authenticating`, or `failed`
- `authUrl` when OAuth user interaction is pending
- `createdAt`, `updatedAt`
- OAuth tokens and dynamic client registration data needed by the auth provider

Unauthenticated requests should return a server-side 401/redirect/error that the client handles without crashing.

## Server functions and routes

Add route handlers or server functions for:

| Operation | Behavior |
| --- | --- |
| Create connection | Validate URL, create an MCP client, call `client.tools()` to probe, persist `ready` or `authenticating`, return `{ state, id?, authUrl? }`, close the probe client. |
| List connections | Require auth, return `{ items: [] }` even when empty. Never return `undefined`. |
| Disconnect | Require auth, delete the connection and stored OAuth material for that user. |
| OAuth callback | Complete the saved OAuth flow, persist tokens, mark the connection ready, return small success/error HTML. |
| `/.well-known/oauth-client` | Serve client metadata before static asset routing when using HTTPS origins. |

For Supabase-backed apps, attach `Authorization: Bearer <access_token>` to every MCP server function call, including list, connect, disconnect, OAuth check/complete, refresh, and retry functions. Logged-out users should see a friendly unauthenticated UI state.

## OAuth provider

Implement an AI SDK-compatible `authProvider` for HTTP/SSE MCP transport. It should provide the app redirect URL, client metadata, token load/save, dynamic client registration load/save, authorization URL capture, and callback resume behavior.

If the installed AI SDK MCP OAuth provider supports Client ID Metadata Document / CIMD, serve:

```json
{ "client_id": "https://<origin>/.well-known/oauth-client" }
```

The full metadata should include `client_name`, `client_uri`, `redirect_uris`, `grant_types`, `response_types`, and `token_endpoint_auth_method: "none"`. Advertise CIMD/client metadata URLs only on HTTPS origins; in local HTTP development, fall back to dynamic client registration when supported.

## UI requirements

Build the MCP connections UI defensively:
- Keep connection state as an array.
- Catch list failures, including thrown `Response` objects with status 401.
- Show a friendly unauthenticated/error state instead of crashing.
- Do not call `.map` on possibly undefined data.
- Preserve the previous list when connect/disconnect fails.
- Let the user retry after sign-in or transient network failures.

## Loading MCP tools into model calls

When building tools for `streamText` or `generateText`, load all `ready` MCP connections for the authenticated user. For each connection, create a short-lived MCP client with the saved auth provider, call `await client.tools()`, namespace tool names when needed to avoid collisions, and merge the MCP tools with the app's normal AI SDK tools.

Close every MCP client after the response stream finishes and also on error cleanup. Do not leak OAuth tokens to the model context or browser UI.

When more than a handful of MCP tools may be connected per user, default to the meta-tool pattern in the `ai-apps-sdk-tool-deferral` skill instead of merging every MCP tool descriptor into the `tools` argument. Skip deferral only when the user explicitly asks for direct/eager tool registration.

## Security

Validate MCP URLs. Allow only `https:` URLs in production. Keep `redirect: "error"` unless there is a specific trusted reason to follow redirects. Encrypt tokens at rest when the app has an encryption facility. Consider an allowlist or explicit confirmation before connecting arbitrary MCP servers. Scope all connection records and token records to the authenticated user.

## Acceptance checks

Before finishing, verify:
- Logged-in users can list MCP connections after page reload.
- Logged-out users see a friendly unauthenticated state.
- Non-auth MCP servers connect and expose tools to the model.
- OAuth MCP servers return an `authUrl`, complete callback handling, persist tokens, and become `ready`.
- The requested service's official MCP URL is researched and included when one exists.
- OAuth MCP connections use the active app session and do not 401 through server functions.
- The next model turn receives tools from `client.tools()`.
- MCP clients close after response streams finish.
- Dynamic client registration works when supported.
- CIMD/client metadata works over HTTPS when supported.
- No Cloudflare Agents MCP APIs are used.
