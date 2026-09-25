---
name: ai-apps-google-chat-message-order
description: The latest google/* chat models (including the current default Gemini Flash) reject requests whose `messages` array ends with an assistant turn. Select this when a chat feature continues an assistant draft or partial reply — "continue writing", completing a half-written message, regenerating from a draft — on a google/* model, or when a google/* model returns a 400 saying requests ending with a model turn are not supported. Do not select for non-google models, for choosing which model to use, or for tool-calling history bugs (use ai-apps-google-chat-tool-pairing).
---

# Google chat requests must end with a user turn

End the `messages` array with a user turn (or tool results) on `google/*` models. The latest Gemini models — including the current default Flash model — reject a request whose final message is an assistant turn (`400: Requests ending with a model turn are not supported.`); older Gemini models instead silently continue the trailing text as a prefill, so the same code breaks on a model upgrade. Never append a draft or partial answer as a trailing `assistant` message for the model to continue — put that text inside the final `user` message ("Continue this draft: …") instead.
