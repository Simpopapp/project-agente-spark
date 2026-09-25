---
name: ai-apps-chat-agent-ui-contract
description: User-facing chat conversation-history and storage contract. Select this only when requested work includes deciding or wiring how a chat agent's conversation history behaves — conversation shape (threaded conversations vs one conversation), storage/persistence (database, browser localStorage, or none), dedicated thread page routes, per-thread message persistence, and the AI SDK message/streaming contract — or builds a new chat-based AI agent or conversational app from scratch, which includes deciding its conversation shape and storage. Use this for conversation-history, threading, and storage decisions in a chat-based AI agent, assistant, chatbot, companion, coach, tutor, support agent, or conversational app, and for any from-scratch build of one. Do not select this for server/model-route API-choice questions, loop mechanics, simple one-shot model-backed features, classification, extraction, backend-only AI calls, non-chat AI features, design-only pages, building or restyling the visible chat UI surface alone (use ai-chat-ui-composition), tool-catalog overload/deferral alone, external chat widgets, or non-AI-SDK stacks.
---

# Chat agent UI contract

For user-facing chat-based agents, ask the user how conversation history should work before choosing the UI/storage shape. Do not assume threaded chat by default.

For building the visible chat UI surface — AI Elements composition, the composer, message styling, tool-result rendering, and agent identity — see `ai-chat-ui-composition`.

Required first step for a new chat-based agent/app:
- If the user did not already answer both choices below, use the questions tool by calling `questions--ask_questions` before implementation.
- Do not enable Supabase, create database tables, write route/component files, or build the chat layout until the answer is available.
- This applies even to broad prompts like "an AI agent I can chat to about life".

Ask these choices:
- Conversation shape: threaded conversations or one conversation.
- Storage: database persistence, browser localStorage, or no persistence.
- Ask these as separate choices. Do not collapse them into a single "History" or "Should past conversations be saved?" question; that only answers storage, not conversation shape.
- If the user answers only storage, such as "save in this browser", the conversation shape is still unanswered. Ask the missing shape question before building the chat layout.

Apply the answer:
- Threads + database: add a thread list, new-thread action, dedicated thread page route, stable active thread ID from the route param, server-side thread metadata, and persisted AI SDK `UIMessage[]`.
- Threads + localStorage: add a thread list, new-thread action, dedicated thread page route, stable active thread ID from the route param, and localStorage records such as `{ id, title, updatedAt, messages: UIMessage[] }`; keep model calls and secrets server-side.
- One conversation + database: skip the thread sidebar; persist the single conversation's messages server-side.
- One conversation + localStorage: skip database setup for chat history; restore messages from localStorage in that browser.
- No persistence: build a single-session chat and do not add thread/history storage.
- A single localStorage key containing one `UIMessage[]`, plus a "New conversation" button that clears it, is one conversation + localStorage. It is not threaded history.

Dedicated thread page routes:
- If the user chooses threaded conversations, every thread must have a real app page URL such as `/:threadId`, `/chat/:threadId`, or the app's equivalent route. Do not keep the active thread only in component state, context, or localStorage.
- Creating a new thread must create or initialize the thread ID, then navigate to that thread route. Reloading `/abc123` must restore thread `abc123` and its messages; it must not silently create a different active thread.
- Switching threads must navigate to the selected thread route. Key the chat window by `threadId`, pass `threadId` as the AI SDK chat `id`, and load/persist messages for that same route thread ID so messages cannot bleed between threads.
- The user-visible thread page route is separate from the model streaming endpoint. Keep the server AI route/function as the backend boundary for model calls; do not treat `/api/chat` or a Supabase Edge Function URL as the dedicated conversation page.
- Classic React Router pattern: define a route like `/:threadId` or `/chat/:threadId`, read it with `useParams`, navigate after creation/selection with `useNavigate`, and handle `/` by selecting or creating a thread and navigating to its route.
- TanStack Start pattern: create a file route such as `src/routes/$threadId.tsx` or `src/routes/chat.$threadId.tsx` with `createFileRoute("/$threadId")` or the matching path. Read params from the route API and navigate/link with typed route params.

Database-backed threads:
- Scope every `threads` and `messages` read/write to the authenticated user. Pass the active `threadId` from the client to the chat route/function and verify the thread belongs to that user before streaming or saving.
- Let the database generate UUID primary keys for message rows. AI SDK message IDs are strings such as `msg_...` and are not UUIDs; store them in a separate text column only if the app needs them for dedupe or reconciliation.
- Save the user message and assistant response to the same active thread. Use `toUIMessageStreamResponse({ originalMessages, onFinish })` and persist the completed assistant `UIMessage` in `onFinish`.
- Check and handle database insert/update errors explicitly. Supabase calls return `{ error }` instead of throwing for many failures; do not leave message persistence as fire-and-forget.
- When loading a thread, fetch messages ordered by creation time, convert rows back to valid `UIMessage` shape, and remount/key the chat window by thread ID so messages do not bleed between threads.
- Before claiming database-backed threads work, create at least two threads, send a message in each, reload, and verify both thread history lists restore the expected messages.

LocalStorage threads:
- Load and create the initial thread with one idempotent client-safe bootstrapping path guarded by `typeof window !== "undefined"`. Read localStorage, create a default thread only when the persisted array is empty, and write that default in the same path. Do not blindly create the first thread in `useEffect`; React StrictMode can remount effects in development and create duplicate blank threads.
- Persist thread updates inside the state update that changes `threads`, and keep `activeThreadId` stable when creating, selecting, deleting, and switching threads.
- Store messages per thread. When rendering an active thread with `useChat`, use the active thread ID as the chat ID and remount/key the chat window on thread changes so messages do not bleed between threads.
- Effects that persist streamed messages must include all referenced dependencies such as `messages`, `status`, `threadId`, and callbacks, or use a deliberately stable callback/ref. Do not omit hook dependencies to quiet loops; fix the state shape instead.
- Do not nest a delete `<button>` inside a thread-row `<button>`. Use a non-button row container with separate select/delete buttons, or make the delete control a sibling. Nested interactive elements create invalid HTML and unreliable clicks.

Required chat-agent UI in every option:
- Server streaming through `toUIMessageStreamResponse({ originalMessages, onFinish })`, with completed messages saved in `onFinish`.
- Immediate optimistic UI after `sendMessage`: show the user message and a typing indicator while `status` is `submitted`, before assistant tokens stream.
- Message rendering through `message.parts`, not only a flat text field.
- Keep the chat textarea focused by default. Focus it on initial render, after sending a message, after stream completion, and after switching threads/conversations unless a modal, popover, or another text input intentionally owns focus.
- For the visible chat UI surface (AI Elements components, composer layout, message styling, tool-result rendering, agent identity), follow `ai-chat-ui-composition`.

Before finishing a chat-agent build:
- Check that the generated UI matches the user's thread/storage answer.
- Check that both thread/storage choices were actually answered. If the user answered only persistence, ask the missing conversation-shape question instead of silently shipping one conversation.
- If the user chose threads, verify the UI has a visible thread list or equivalent thread navigation, a new-thread action that navigates to a dedicated thread URL, route-derived active thread IDs, reload restoration for a thread URL, and per-thread message storage.
- If the user chose database-backed threads, verify message inserts do not pass AI SDK `msg_...` IDs into UUID columns, persistence errors are surfaced/logged, and each thread reloads its own saved messages after a page refresh.
- If the user chose localStorage threads, verify there is no first-thread creation in `useEffect`, no duplicate blank threads after initial render, and no nested buttons in the thread list.
- Check that the chat textarea stays focused during normal chat use.
- Do not add a thread list when the user chose one conversation, and do not add database-backed history when the user chose localStorage or no persistence.
