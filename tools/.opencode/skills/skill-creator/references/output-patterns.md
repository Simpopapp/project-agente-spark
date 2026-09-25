# Output Pattern Skills

For skills that specify a structured output the agent should produce — commit messages, report formats, JSON schemas, code templates. Read `principles.md` first.

## When this shape fits

- The user wants every future task of a given kind to produce output in a specific shape.
- Quality depends on the shape, not just the content.

Common examples: commit message conventions, code review report formats, security review reports with severity tags, PRD or RFC templates.

## Two strictness levels

### Strict template

For formats with non-negotiable structure (API responses, data files, machine-readable output):

```markdown
## Commit message format

Always use this exact template:

type(scope): brief description

[longer explanation if needed]
- bullet 1
- bullet 2
```

### Flexible default

For formats where some adaptation is useful (reports, summaries, design specs):

```markdown
## Report structure

Here is a sensible default; adapt sections to the analysis:

# [Title]

## Executive summary
[Overview]

## Key findings
[Adjust sections as needed]
```

## Show examples

For non-trivial formats, include input/output pairs. Examples convey style faster than prose rules.

```markdown
**Example 1**
Input: Added user authentication with JWT tokens.
Output:
feat(auth): implement JWT-based authentication

Add login endpoint and token validation middleware.

**Example 2**
Input: Fixed wrong date format in reports.
Output:
fix(reports): correct date formatting in timezone conversion
```

Two or three examples usually suffices. More starts to crowd context — see `principles.md` on conciseness.
