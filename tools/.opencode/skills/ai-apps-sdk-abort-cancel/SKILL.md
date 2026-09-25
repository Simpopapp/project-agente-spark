---
name: ai-apps-sdk-abort-cancel
description: User-facing stop/cancel behavior for AI SDK streaming chat surfaces. Select this only when requested work includes a cancel or stop-generating button, a user-stopped run that keeps running, partial assistant text that disappears after reload, an aborted stream that does not render, or a missing stop affordance while the request is pending. Do not select this for API-choice docs, loop-limit docs, general tool-loop design, generic chat apps without cancellation bugs, non-AI-SDK chat stacks, or backend/Go services.
---

# Aborting / canceling an AI SDK agent loop

An end-to-end stop button needs **three** coordinated pieces. Missing any one of them produces a visible bug:

1. **Server** — pass the request's `AbortSignal` into `streamText` so the model and tool loop actually stop.
2. **Client UI** — pull `stop` from `useChat` and let the submit button toggle to a Stop button while the stream is live.
3. **Persistence on abort** — save the partial assistant message **from the client**, not the server. On Cloudflare Workers the Worker terminates with the client disconnect, so the server-side `onFinish` of `toUIMessageStreamResponse` is not reliable for aborted runs.

Do not stop after wiring (1) and (2). A stop button that visually works but loses the partial answer after reload is the most common failure mode here.

## Server: forward the abort signal

In the chat route handler (`src/routes/api/chat.ts` or the project's equivalent), pass `request.signal` into `streamText`:

```ts
const result = streamText({
  model,
  system: SYSTEM_PROMPT,
  tools,
  stopWhen: stepCountIs(50),
  messages: await convertToModelMessages(messages),
  abortSignal: request.signal,
});
```

When the client calls `stop()` (or navigates away), `fetch` aborts, `request.signal` fires, and `streamText` stops issuing model calls and tool calls. Without `abortSignal`, the loop keeps running on the server and continues burning tokens even after the UI looks "stopped".

In the server's `onFinish` for `toUIMessageStreamResponse`, **skip the database write when aborted**. Aborted runs are persisted by the client (see below); writing here too either silently fails (Worker already torn down) or races the client and produces duplicates:

```ts
return result.toUIMessageStreamResponse({
  sendReasoning: true,
  originalMessages: messages,
  onFinish: async ({ responseMessage, isAborted }) => {
    // Worker terminates with the client connection on abort, so this hook
    // is not reliable for aborted runs. The client persists those.
    if (isAborted) return;
    if (!responseMessage.parts || responseMessage.parts.length === 0) return;
    await supabase.from("messages").insert({
      thread_id: threadId,
      user_id: userId,
      role: "assistant",
      parts: responseMessage.parts as never,
    });
  },
  onError: (err) => { /* ... */ },
});
```

Do not reach for `consumeSseStream: ({ stream }) => stream.pipeTo(new WritableStream())` as a way to "drain the stream server-side so `onFinish` fires after abort". It does keep the server stream draining when the client disconnects on long-running Node servers, but on Cloudflare Workers the runtime tears the request context down once the client connection closes, and the callback's promise is not guaranteed to run to completion. Treat server-side persistence on abort as best-effort only and always pair it with a client-side fallback.

## Client UI: wire `stop` into the submit button

Pull `stop` out of `useChat` and pass it (plus `status`) into the submit affordance. With AI Elements' `<PromptInputSubmit>`, that is all the UI needs — it already swaps to a stop icon when `status === "submitted" || "streaming"` and calls `onStop` instead of submitting:

```tsx
const {
  messages,
  sendMessage,
  status,
  error,
  setMessages,
  stop,
} = useChat({
  id: threadId,
  messages: initialMessages,
  transport,
  onError: (e) => toast.error(e.message),
  onFinish: async ({ message, isAbort }) => {
    // see "Persistence on abort" below
  },
});

// ...

<PromptInputFooter className="justify-end">
  <PromptInputSubmit
    size="icon-sm"
    className="rounded-full h-9 w-9"
    status={status}
    onStop={stop}
  />
</PromptInputFooter>
```

If the chat surface also supports mid-stream interjection (sending a follow-up while the agent is still running), keep that path in `handleSubmit` and only rely on the button's stop behavior for cancel. The Stop button must call `stop()` directly, not submit an empty message.

For a custom (non–AI Elements) submit control, mirror the same contract: render a stop icon while `status` is `submitted` or `streaming`, set `type="button"` in that state, and call `stop()` on click instead of submitting the form.

### Show the stop button during the "thinking" state, not a spinner

The agent is already in flight — and therefore already cancelable — the moment `sendMessage` runs and `status` flips to `"submitted"`, before any tokens arrive. The button must show the **stop affordance during that thinking window**, not a loading spinner. A spinner on the submit button reads as "you can't do anything right now" and hides the cancel path the user actually has.

AI Elements' shipped `PromptInputSubmit` renders `<Spinner />` for `"submitted"` and only swaps to `<SquareIcon />` once `"streaming"` starts. That is the wrong default for an agent loop. Patch the component (it is vendored under `src/components/ai-elements/prompt-input.tsx`) so both states render the stop icon:

```tsx
// src/components/ai-elements/prompt-input.tsx
const isGenerating = status === "submitted" || status === "streaming";

let Icon = <CornerDownLeftIcon className="size-4" />;

if (status === "submitted" || status === "streaming") {
  Icon = <SquareIcon className="size-4" />;
} else if (status === "error") {
  Icon = <XIcon className="size-4" />;
}
```

Do not branch the click handler on `streaming` vs `submitted` either — `isGenerating` already covers both states, so the existing `if (isGenerating && onStop) { onStop(); return; }` works unchanged. The point is that the click must call `stop()` from the very first frame of the in-flight request, not wait until tokens start arriving.

If the project shows a separate "Dainiel is thinking…" / shimmer row elsewhere in the layout while `status === "submitted"`, leave that alone — that is a conversation-level affordance, not a button affordance. The submit button itself should never render a spinner.

Practical gotchas:

- Edits to the vendored `prompt-input.tsx` sometimes don't hot-reload cleanly in the dev preview. If after the change the user still reports a spinner, restart the dev server before re-investigating — the code on disk is usually already correct.
- Do not remove the `Spinner` import or the spinner from `submitted` only to add it back on a different `loading`/`isLoading` prop. The whole point is that the submit button stops being a "loading" UI and becomes a "cancel" UI as soon as work is in flight.
- Do not gate the stop button on `streaming` alone (`status === "streaming"`). On slow first tokens this leaves the user staring at a spinner with no way to cancel.

## Persistence on abort: do it on the client

On Cloudflare Workers (and any edge runtime that ties request lifetime to the client connection) the server's `onFinish` does **not** reliably fire when the client aborts — the Worker is torn down with the connection. The fix that actually works is to persist the partial assistant message from the browser, using `useChat`'s client-side `onFinish({ message, isAbort })`:

```tsx
const cancelSavedRef = useRef(false);

const { messages, sendMessage, status, error, setMessages, stop } = useChat({
  id: threadId,
  messages: initialMessages,
  transport,
  onError: (e) => toast.error(e.message),
  onFinish: async ({ message, isAbort }) => {
    if (isAbort && user && !cancelSavedRef.current) {
      cancelSavedRef.current = true;

      const parts = (message?.parts ?? []) as UIMessage["parts"];
      const cloned = parts.map((p) => ({ ...p })) as UIMessage["parts"];

      // Append a "_Stopped._" marker to the last text part so the saved
      // message clearly reflects that the run was canceled.
      let lastTextIdx = -1;
      cloned.forEach((p, i) => {
        if (p.type === "text") lastTextIdx = i;
      });
      if (lastTextIdx >= 0) {
        const t = cloned[lastTextIdx] as { type: "text"; text: string };
        t.text = `${t.text}\n\n_Stopped._`;
      } else {
        cloned.push({ type: "text", text: "_Stopped._" } as never);
      }

      const { error: insertErr } = await supabase.from("messages").insert({
        thread_id: threadId,
        user_id: user.id,
        role: "assistant",
        parts: cloned as never,
      });
      if (insertErr) {
        console.error("Failed to persist canceled message", insertErr);
      }
    }
    onUserSentMessage();
  },
});

// Reset the cancel-saved guard whenever a new turn starts.
useEffect(() => {
  if (status === "submitted" || status === "streaming") {
    cancelSavedRef.current = false;
  }
}, [status]);
```

Key points:

- Use `useChat`'s `onFinish`, not a custom listener on `stop()`. `onFinish` is the one place that runs both for clean completion and for client abort, and it receives the partial `message` already assembled from the streamed parts.
- Guard with a `useRef` (`cancelSavedRef`) so a re-render or duplicate `onFinish` invocation cannot insert the message twice. Reset the guard on each new turn (`status` transitions into `submitted`/`streaming`).
- Save the same `UIMessage["parts"]` shape the server writes for completed turns. Reloading the thread reads from the same `messages` table and renders through the same `message.parts` path, so the canceled message will render with all of its streamed text, reasoning, and tool calls intact.
- Append a `_Stopped._` marker (or attach metadata) so the UI can show the canceled state. If the project uses message metadata instead of an inline marker, set that metadata field here and render it as a "Stopped" pill in the message component.
- On abort, the Stop button itself does not need to call Supabase. `stop()` triggers the abort, the stream closes, `useChat` fires `onFinish({ isAbort: true })`, and the handler above persists the message. Do not add a second save inside the click handler — it will race.

## Why not server-only or client-only

- **Server-only persistence on abort**: unreliable on Workers/edge runtimes. The Worker terminates with the client connection and the `onFinish` callback (even when fed by `consumeSseStream`) is not guaranteed to run to completion.
- **Client-only persistence for everything**: works for aborts but means a user who closes the tab mid-stream loses the assistant message entirely. Keep the server's normal `onFinish` writing completed turns, and let the client handle the abort case.

Split the responsibility:
- Completed turn → server `onFinish` writes the assistant message.
- Aborted turn → server `onFinish` returns early; client `onFinish({ isAbort: true })` writes the partial message.

## Rendering the stopped state

The UI must keep the canceled assistant message visible after the stream ends:

- Render `message.parts` exactly the same way for completed and aborted messages. Do not hide a message because `status` transitioned to `ready` while its last part is still streaming text.
- The `_Stopped._` marker (or metadata flag) added during persistence is what tells the user the run was canceled. Style it as a subdued pill or italic line under the partial text — do not replace the streamed content with a generic "canceled" placeholder.
- After `stop()`, do not clear `messages` or reset the chat. The assistant message stays in `messages` as `useChat` last saw it; the client `onFinish` writes the same shape into the database so a reload renders an identical view.

## Acceptance checks

Before finishing, verify:

- The submit button switches to a stop icon (no spinner) the moment `status === "submitted"` — before any tokens have streamed — and stays as a stop button through `"streaming"`.
- Clicking Stop during the "thinking" window (after `sendMessage`, before the first token) cancels the in-flight request — the user is never blocked behind a loading spinner.
- Clicking Stop during model streaming halts further tokens within a second and the submit button returns to its default state.
- Clicking Stop during a tool call halts further model/tool execution and does not start a new iteration.
- Stopping mid-stream keeps the already-streamed text, reasoning, and tool parts visible in the conversation, with a clear stopped/canceled indicator.
- Reloading the page after a cancel shows the same partial assistant message plus the stopped marker — not just the user message on its own.
- A completed (non-canceled) turn still persists once and only once, written by the server's `onFinish`. Canceled turns persist once, written by the client's `onFinish({ isAbort: true })`.
- Starting a new turn after a cancel works normally and does not re-save the previous canceled message.
- The server's `streamText` call receives `abortSignal: request.signal`. Without it, tokens keep streaming on the server even when the UI shows "stopped".
