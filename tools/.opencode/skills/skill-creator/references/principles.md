# Authoring Principles

Read before drafting any skill. These principles apply regardless of the shape (workflow, knowledge, output).

## Concise

The skill body loads after the description triggers and shares context with everything else. Default assumption: the agent reading is already capable. For each paragraph ask whether a fresh agent without this skill would fail at the task — if not, cut it. Skip standard programming knowledge and obvious next steps.

## Ask sparingly

When authoring needs information you don't have, ask the minimum needed to fill the gap. Two or three pointed questions usually suffice; don't interrogate.

- **Workflow already in this conversation**: extract from history first (use chat-history search if compaction may have dropped earlier turns), confirm what you found, then ask only about what's missing.
- **Specific request**: clarify scope and edge cases; skip questions about format you can decide.
- **Vague request**: one or two questions to localize the gap, then propose a direction rather than asking five more.

Don't save until the user has confirmed at least the skill name, the trigger description, and any required inputs.

## Default to instructions

Prose handles most skills. Reach for a script only when the operation must run deterministically — file transforms, fixed sequences, validation that needs to fail loudly. If a paragraph of instructions would produce the same outcome, skip the script.

## Match specificity to fragility

Pick the level of detail based on how easily the task breaks.

| Freedom | When to use | Example |
| --- | --- | --- |
| High (prose) | Multiple approaches valid; choice depends on context | "Choose a layout that fits the data" |
| Medium (parameterized commands) | Preferred pattern exists; some variation is fine | "Run `extract.py --format json`" |
| Low (specific script, fixed sequence) | Fragile, must run in exact order | "Run the four-step migration in this exact order" |

A narrow bridge with cliffs needs guardrails. An open field needs none. Don't over-script flexible decisions; don't under-script fragile ones.

## Explain why, not just what

Prefer reasoning over absolutes. A reason guides the agent through novel situations a rule cannot anticipate.

Bad:
```
ALWAYS run validation before commit.
```

Good:
```
Run validation before commit — a schema mismatch corrupts the index and
requires manual repair to recover.
```

Reserve absolutes (`MUST`, `NEVER`, `ALWAYS`) for true invariants — safety, irreversibility, security.

## Composability

Skills can reference other skills. If your skill needs a sub-step that another skill already handles well, point to it rather than duplicating.

```
After generating the report, follow the {pdf-export} skill to produce the
final file.
```

## Description writing

The description is the only line retrieval sees before the body loads. It is the highest-leverage line in your skill.

- Include both what the skill does and when it should trigger.
- Use concrete triggers: file types, verbs, scenarios, keywords the user is likely to say.
- Be specific. Vague descriptions silently fail to fire.

Bad:
```
description: Helps with database stuff.
```

Good:
```
description: Use when creating, editing, or debugging Spanner migrations in
this repo. Triggers on "migration", "spanner schema", "add column".
```

## Imperative voice

Write instructions to the future agent in imperative form: "Run the migration", not "You should run the migration". Shorter and clearer.

## Don't duplicate

Information lives in one place. If `SKILL.md` covers it, references don't. If a reference covers it, `SKILL.md` doesn't. If the static skill instructions cover it (locations, lifecycle, bundled file mechanics), neither does.
