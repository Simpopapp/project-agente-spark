---
name: skill-creator
description: Use whenever the user wants to capture, reuse, find, or update specialized agent instructions — even when they don't say "skill". Triggers on "make a skill", "skillify this", "save this workflow", "remember how to do X", "save what we just did so we can reuse it", "find something that does X", "is there a skill for X", "make this reusable", or asking the agent to repeat a previously-shown procedure on a new input.
---

# Skill Creator

A skill teaches a future agent instance something it could not handle well from general training alone — project conventions, specialized workflows, schemas, output specs, tool integrations. Skill = onboarding for one specific task.

This file is a navigation map. Read the references that match what the user is doing.

## Before authoring: is this a skill or always-on knowledge?

Skills are surfaced by retrieval — they load only when the description matches the current task. If the user wants information available on **every request**, a skill is the wrong shape; point them at project knowledge or workspace knowledge instead.

If the user wants situational expertise that only matters for certain tasks, a skill is the right fit — continue below.

## Decide the path

Three branches, in priority order:

1. **The user has something specific** — a concrete request, a workflow already executed in this conversation, or clear intent for a particular kind of skill. → Pick the shape and author.
2. **The user is vague** ("make me a skill", "find something for X") → Start with the finder. A battle-tested skill from the registry usually beats one written from scratch.
3. **The user has a rough idea but lacks detail** → Work with them to gather enough context (ask sparingly — see principles), then author.

References live at `knowledge://skill/skill-creator/references/{file}.md`.

| Path | Read |
| --- | --- |
| Find or import an existing skill | `knowledge://skill/skill-creator/references/finder.md` |
| Author any skill — read first | `knowledge://skill/skill-creator/references/principles.md` |
| Capture a procedural workflow ("skillify this", repeated steps) | `knowledge://skill/skill-creator/references/workflows.md` |
| Capture domain knowledge (schemas, conventions, API patterns) | `knowledge://skill/skill-creator/references/reference-skills.md` |
| Define a structured output format | `knowledge://skill/skill-creator/references/output-patterns.md` |
| Skill outgrowing one file | `knowledge://skill/skill-creator/references/progressive-disclosure.md` |

## Frontmatter and naming

Every SKILL.md needs YAML frontmatter:

```yaml
---
name: my-skill
description: What this skill does, and when it should trigger.
---
```

- Name: lowercase, hyphens only, max 64 chars, starts with a letter, ends with a letter or digit.
- Description: the highest-leverage line in the skill — see `knowledge://skill/skill-creator/references/principles.md`.

## File layout

```
.agents/skills/{skill-name}/
├── SKILL.md           # required
├── references/        # optional — docs loaded on demand
├── scripts/           # optional — .sh, .bash, .py, .js, .jsx, .mjs, .cjs, .ts, .tsx; copyable then executable
└── assets/            # optional — templates, fonts, fixed files
```

## Hand-off

When the draft directory is complete, call `skills--apply_draft` with the skill root directory path (e.g. `.agents/skills/{skill-name}`), not the SKILL.md file path.
