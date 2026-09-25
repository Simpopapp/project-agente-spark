---
name: ad-landing-page-audit
description: Use when the user wants to check that an ad and the page it links to tell the same story. They ask to check ad-to-page message match, review an ad asset against its exact landing page, or diagnose a visible disconnect between a live ad and its destination. Plain asks count too, e.g. "does my ad match my site".
---

# The ad-to-page handoff

Extends the ad campaign workflow with an ad-to-page consistency check; regeneration of a failing asset goes to `ad-design`. Compare a supplied or drafted ad asset with the exact landing-page URL it sends people to. Do not modify the ad, page, campaign, or budget.

## The comparison

1. Capture the ad's visible primary message, supporting text, offer, proof, CTA, product or UI, audience cue, visual system, and destination URL.
2. Inspect the landing page with the available website tools; when the destination is this project, use its preview screenshot and repo source, not an external fetch. Record its visible hero, audience cue, proof, CTA, offer, product evidence, and visual system.
3. Report each dimension as **matches**, **gaps**, or **unknown**: promise, audience, product, proof, offer, CTA and destination, and visual handoff. Cite the ad asset or brief and the page URL for every finding.
4. Separate facts from recommendations. A missing, conflicting, or unsupported element is a gap; do not claim it reduces conversion or estimate an uplift.

## The next step

Recommend the smallest reversible fix first (correct the ad promise, choose a better-matched destination, or revise the page evidence) and name the observed gap it addresses. Hand the corrected brief to `ad-design` when the asset needs regeneration; otherwise return the audit for user approval.
