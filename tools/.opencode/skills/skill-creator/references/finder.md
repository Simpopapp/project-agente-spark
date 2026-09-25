# Finding Skills

Discover before authoring. Many tasks already have a battle-tested skill — importing one is cheaper and more reliable than writing a new one. Two sources to check: the user's workspace, and the public registry.

## Workspace

Active workspace skills are already auto-surfaced when retrieval matches. If you suspect a relevant skill exists but didn't surface, list directly:

```
code--exec ls .workspace/skills/
code--view .workspace/skills/{skill-name}/SKILL.md
```

If you find a fit, point the user at it — no new skill needed.

## Public registry (skills.sh)

The `skills` CLI searches a public registry of skills published by orgs and individuals. Anyone can publish, so install count and publisher carry the trust signal.

Find skills matching a query:

```
code--exec npx -y skills find <query>
```

Results are sorted by install count. Sample output for `find deploy`:

```
microsoft/azure-skills@azure-deploy        307K installs
vercel-labs/agent-skills@deploy-to-vercel   48K installs
expo/skills@expo-deployment                 25K installs
supercent-io/skills-template@deployment-automation   11K installs
github/awesome-copilot@azure-deployment-preflight     9K installs
```

The registry returns up to ~6 results sorted by installs. If none match, the registry doesn't have it — fall back to authoring instead of substituting a loosely related skill.

## Trust signal

| Signal | Lean toward |
| --- | --- |
| ≥10K installs from a known org (vercel-labs, openai, microsoft, github, google-labs-code, expo, anthropic, etc.) | Quick description check, then propose |
| 1K–10K installs | Read SKILL.md before proposing; confirm it does what the description claims |
| <1K installs | Only if it's clearly the right match and the SKILL.md looks well-structured |
| No results for the query | Don't substitute a loosely related skill — author instead |

## Importing a candidate

`skills add` writes into `.agents/skills/` (drafting location) for review:

```
code--exec npx -y skills add <owner>/<repo>@<skill> -a amp --yes
```

After installation:

1. Read `.agents/skills/{skill-name}/SKILL.md` to confirm fit and summarize it for the user.
2. Call `skills--apply_draft` with the directory path.

## Examples of good registry skills

These illustrate the bar — focused triggers, concrete instructions, clear conventions — in domains Lovable doesn't already cover:

- `remotion-dev/skills@remotion-best-practices` — patterns for programmatic video with Remotion.
- `obra/superpowers@brainstorming` — structured brainstorming methodology before implementation.
- `vercel-labs/agent-skills@web-design-guidelines` — visual web design guidelines (typography, spacing, hierarchy).
- `shadcn/ui@shadcn` — using shadcn/ui components and CLI conventions.
- `coreyhaines31/marketingskills@seo-audit` — SEO audit workflow for live pages.
- `mattpocock/skills@to-prd` — convert rough notes into a structured PRD.

Security skills are also common in the registry and span all three shapes (audit *workflows*, *reference* conventions, structured review *output*).
