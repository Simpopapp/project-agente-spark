---
name: ad-research
description: Use when the user wants to figure out what their ad creative should be, before anything gets generated. They ask for ad concepts, competitor-ad inspiration, a brand creative brief, or a website-grounded creative strategy for a paid campaign. Plain asks count too, e.g. "how do I make good ads", "what should my ads look like", or "help me figure out my ads".
---

# Paid-ad creative research

Extends ad campaign planning: produce an evidence-backed creative brief for `ad-design`. It does not generate images, change a campaign, estimate performance, or claim access to competitors' spend.

## Evidence

1. When the flow carries a stored campaign brief, read it first; re-derive only what it lacks, and carry its language and markets into every demand and competitor lookup.
2. Sweep the project, then the live page: repo images (`src/assets`, `public/`), documents and earlier ad assets under `/mnt/documents`, chat attachments, and a screenshot of the brand's public landing page. Record the product, conversion goal, confirmed audience and need, visible proof points, approved messaging, palette roles, type treatment, imagery and logo rules, signature patterns, and usable images with their file paths. A real project asset beats a re-screenshot of the same content. Record an unconfirmed audience or need as a hypothesis, never as fact.
3. Load `ad-competitor-research` early in every brief; it checks marketing memory before external research and discovers likely competitors only when needed. A yes to the flow's research offer covers competitor research; do not re-ask. Reuse matching saved evidence with its dates instead of repeating a sweep for each campaign; refresh only the gaps or current evidence the request needs. Skip external competitor research when the user declines or asks for the fastest pass; an explicit request to use saved findings still permits recall. Load `ad-messaging-angles` when the user provides customer voice or asks for source-backed messaging angles. Use both skills' outputs as evidence; do not repeat their research.

## The brief

Return a compact brief with **Brand system**, **Audience and proof**, **Reference patterns**, **Search demand** when available, **Angle evidence** when available, and **Three creative directions**. Keep project facts, observed ads, landing pages, Semrush estimates, and hypotheses separate. Each direction connects a supported audience need and the conversion goal to an observed competitive contrast, a search-demand comparison when available, and a brand proof point; omit a missing lane instead of filling it with an assumption. Use search demand to inform customer language; justify each direction from the full evidence chain, never from one metric or source. Keep campaign-specific decisions in the campaign brief. When the canonical competitor research was saved and verified, reference it and its source dates instead of copying it into each provider's brief; otherwise use the conversation's sourced evidence without claiming a saved reference.

Carry the original capture dates and inspected-sample limits into every user-visible direction, including `questions--ask_questions` card options. Label competitive openings as hypotheses; an unavailable library is an unknown, not evidence of what that competitor does or never does.

## The recap and kickoff

The brief is working material. The chat message is at most five short plain-language bullets a non-marketer can act on, plus one closing line naming the next step. No marketing jargon (CAC, CPC, SERP, "whitespace"), no tool or fetch mechanics, no option menus. The bullets and, in the campaign create flow, one Continue button (the ads conduct knowledge's block, its message naming that next step) are the reply's closing content, and the turn ends there; text followed by another tool call in the same reply never reaches the user.

In the campaign create flow, open the flow's next card in the next turn with `questions--ask_questions`, never prose or action chips in the card's place (the Continue button ends the research turn; it never replaces the card); the ads knowledge owns which card is due, its shape, and what rides on it. After the user selects or refines a direction, hand the selected brief to `ad-design`.

## Grounding

1. Use claims only when they appear on the brand's public materials or come from the user. Do not turn third-party opinions or search snippets into product claims.
2. Link public references in the recap. Report impressions, spend, conversion rate, or targeting only when the source explicitly provides them.
3. Use references to find contrast and creative whitespace, not to imitate a competitor. The final direction keeps the brand's actual product, visual system, and approved message.
