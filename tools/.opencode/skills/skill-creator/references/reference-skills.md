# Reference Skills

For knowledge-shaped skills — schemas, conventions, API surfaces, project-specific patterns. The skill teaches *what something looks like*, not a sequence to follow. Read `principles.md` first.

## When this shape fits

- The user wants the agent to know a specific data schema, API, or codebase convention.
- The knowledge is stable rather than procedural.
- Future tasks benefit from knowing this up front, without re-deriving it each time.

## Structure

```markdown
# Skill Title

## When to use
- Concrete trigger 1
- Concrete trigger 2

## [Domain name]
The actual knowledge — schemas, conventions, examples.
```

The body *is* the reference. There is no workflow.

## What fits

- This project's API client conventions — which patterns to follow, which to avoid, what existing files to model new code on.
- A BigQuery dataset's tables, columns, and join keys.
- An event-tracking schema with required fields per event.
- A design system's tokens, semantic colors, typography ramps.
- Security conventions for this codebase — what to validate, where, what not to log, which patterns are forbidden.

## What does not fit

- "How to deploy" → that's a workflow (see `workflows.md`).
- "How to format a commit message" → that's an output spec (see `output-patterns.md`).
- "General SQL syntax" → too generic. The agent already knows this.

If the knowledge is something a competent agent would know from general training, no skill is needed.

## Scope sharply

A reference skill should be focused. If the body grows past ~150 lines or covers multiple unrelated domains, split into subdomain references — see `progressive-disclosure.md`.
