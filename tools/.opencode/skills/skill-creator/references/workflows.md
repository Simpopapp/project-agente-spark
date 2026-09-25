# Workflow Skills

For procedural skills — sequences of steps the agent should run to complete a specific task. Read `principles.md` first.

## When this shape fits

- The skill encodes a repeatable process (deploy / migrate / generate / validate / audit).
- The user said "skillify this", "save this workflow", or "make this reusable".
- The agent has already done the work once in this conversation and the user wants it captured.

Common examples: deployment runbooks, migration sequences, code-generation pipelines, security audits ("scan Firestore rules for permissive defaults and report by severity").

## If extracting from this conversation

Compaction may have removed earlier turns. Before drafting:

1. Use `conversation_search` (or the equivalent chat-history retrieval) to recover the full sequence of tool calls and decisions. Don't rely on what's currently visible.
2. Note corrections the user made — those are hidden constraints that belong in the skill.
3. Confirm with the user if any step is ambiguous before drafting. Don't guess at intent.

## Structure

```markdown
# Skill Title

## When to use
- Concrete trigger 1
- Concrete trigger 2

## Workflow
1. First step.
2. Next step.

## Conventions
- Project-specific naming, paths, libraries.

## Validation
- How to confirm the task succeeded.
```

## Sequential vs conditional

For straight-line workflows, give an overview before the details so the agent sees the shape:

```markdown
Filling a form involves:
1. Parse the schema (run `extract.py`)
2. Map fields (edit `mapping.json`)
3. Validate (run `validate.py`)
4. Submit (run `submit.py`)
```

For branching workflows, name the decision points:

```markdown
1. Identify what changed:
   - **New entity?** → follow "Creation workflow"
   - **Existing entity?** → follow "Update workflow"

2. Creation workflow: ...
3. Update workflow: ...
```

## Success criteria

For fragile workflows, each non-trivial step earns one line saying how to tell it succeeded. This turns the skill from "read and roughly follow" into "execute and verify."

```markdown
1. Run `lov migrate up`.
   **Success:** command exits 0 and `lov migrate status` shows the new revision as applied.
```

Skip success criteria when steps are obvious or the agent can verify them inline.

## Edge cases

List known failure modes with the recovery action. Skip if there are no surprises — don't manufacture edge cases for the sake of having them.
