# Progressive Disclosure

How to organize a skill that has outgrown a single SKILL.md. Apply when:

- SKILL.md is past ~300 lines.
- The skill spans multiple domains, frameworks, or variants.
- Different tasks need different subsets of the content.

Goal: keep SKILL.md as a navigation map; load detail only when needed.

## Pattern 1 — high-level guide + topical references

```
my-skill/
├── SKILL.md           # overview + when to read each reference
└── references/
    ├── forms.md
    ├── api-reference.md
    └── examples.md
```

SKILL.md introduces each reference with one line on when to load it. A bare link is invisible — without the "read X when Y" hint the agent never opens it.

## Pattern 2 — domain-organized references

For a skill spanning multiple unrelated areas:

```
bigquery-skill/
├── SKILL.md           # overview + dataset selection
└── references/
    ├── finance.md     # billing, revenue
    ├── sales.md       # opportunities, pipeline
    └── product.md     # API usage, features
```

The agent never loads `sales.md` for a finance question.

## Pattern 3 — framework / variant split

For a skill supporting multiple implementations:

```
cloud-deploy/
├── SKILL.md           # workflow + provider selection
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```

SKILL.md owns the decision tree; references own the specifics.

## Rules

- Keep references one level deep from SKILL.md. No nested reference trees.
- Reference files past ~100 lines should have a short table of contents at the top.
- Each reference link in SKILL.md must say *when* to read it. Naked links are dead weight.
- One fact, one home. SKILL.md and a reference don't repeat each other.
