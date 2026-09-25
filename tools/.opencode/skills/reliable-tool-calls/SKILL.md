---
name: reliable-tool-calls
description: Use whenever tools are needed. Enforces valid OpenCode tool-call serialization via the XML tool-call protocol, safe file operations, and verification before reporting success.
---

# Reliable Tool Calls

Use tools only through the XML tool-call format below. Never simulate a tool call in prose, never describe a tool call instead of emitting it, and never place tool-call XML syntax inside a shell command string.

## Required Format

When invoking a tool, emit exactly one XML tag matching the tool's name, with one child tag per parameter:

```text
<tool_name>
  <param_name>value</param_name>
</tool_name>
```

- Pass arguments directly as child tags according to the tool's schema — do not wrap them in an extra `arguments` object or JSON string.
- Emit nothing else outside the tag when calling a tool: no prose before or after, no Markdown code fences wrapping the tag itself.
- For multi-line content (file contents, patch text, shell commands), place the raw text inside the parameter tag as-is. Do not escape quotes, do not escape newlines, do not JSON-encode the content.
- Do not concatenate prose, Markdown, or another tool's tag into a parameter value.
- Never place another tool's tag (e.g. `<read>`, `<glob>`) inside `<bash>`'s command parameter — those are separate tool calls, not shell syntax.
- Use separate, sequential calls when one operation depends on the result of another.
- Only emit multiple tags in the same response when the calls are genuinely independent of each other's output; otherwise wait for each result before emitting the next tag.
- If your reasoning/thinking process is visible in your output, always close it before emitting a tool-call tag — the tag must appear outside any reasoning block.

## Tool Selection

- Use `glob` to locate files.
- Use `grep` to search file contents.
- Use `read` to inspect files and directories.
- Use `write` to create new files.
- Use `edit` for direct in-place file edits.
- Use `patch` for diff-based multi-hunk edits.
- Use `bash` only to execute terminal commands such as tests, builds, package managers, and Git operations.
- Use `task` to delegate to a subagent.
- Use `todowrite`/`todoread` to track multi-step work.
- Use `question` only when a user decision is genuinely required.

## File Operations

1. Discover the real path with `glob` or `read`; never invent placeholder paths.
2. Inspect existing files before editing them.
3. Create new files with `write`, apply targeted edits with `edit`, and apply multi-hunk diffs with `patch` using a raw `patchText` parameter.
4. Read changed files after patching when confirmation is useful.
5. Run the relevant validation command after code or configuration changes.

Example:

```text
<patch>
  <patchText>*** Begin Patch
*** Add File: example.txt
+content
*** End Patch</patchText>
</patch>
```

## Truthfulness And Recovery

- Never claim that a file was created, edited, tested, or built until the tool result confirms it.
- If a tool reports a schema or parsing error, re-check the expected parameter names for that tool and retry with one minimal, correctly-tagged call.
- Do not blame the shell or integration when the generated call itself was malformed XML or used the wrong tag name.
- After a failed edit, verify whether any partial change occurred before retrying.
- Report unresolved failures explicitly and include the exact failed validation.

## Completion Check

Before reporting success, confirm all applicable items:

- The intended file exists.
- The resulting content matches the request.
- No unrelated files were modified.
- Relevant validation completed successfully, or its failure is clearly reported.
