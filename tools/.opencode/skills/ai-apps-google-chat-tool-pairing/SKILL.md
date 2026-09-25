---
name: ai-apps-google-chat-tool-pairing
description: google/* models reject tool-calling histories whose function calls and function responses do not pair up. Select this when a tool-calling chat on a google/* model trims, truncates, or summarizes conversation history before sending it, or when a google/* request fails saying function response parts must equal function call parts. Do not select for non-google models, for tool schema design, or for draft-continuation message-order bugs (use ai-apps-google-chat-message-order).
---

# Keep tool calls paired with their responses

Keep every assistant tool-call message immediately followed by all of its matching tool-response messages; `google/*` models reject a history where a tool call has no tool response or a response has no call. When trimming or summarizing history, drop a tool call and its responses as a unit — an index-based slice over a flat messages array cuts between them.
