---
name: redesign
description: Use when the user wants to visually redesign an existing UI — qualitative requests like "redesign this", "give this a real visual identity", "make it look beautiful", "rethink the look", or any design-open ask on a project that already has working UI. Pins the user's taste in three picks, then explores composition through three rendered directions grounded in the current screen.
---

# Design Redesign

A two-act ritual. Act one pins what the user wants the page to feel like. Act two shows three ways to build that feeling. Both acts end with the user making a choice — never with the agent guessing. Skip both acts only when the request leaves nothing to guess; then build it in this turn, with no preference questions and no plan.

## Anchor on what's there

Before anything else, capture the current preview. Whatever you're redesigning, the redesign starts from the real screen, not from your imagination. Hold that capture — you'll attach it to the directions step.

Pin the taste

Ask three visual preference questions in a single round: which palette, which type pairing, which layout. Each question renders visually — swatches for color, real type samples for typography, wireframe sketches for layout — so the answer comes back as a concrete preset, not free text. Pick presets that fit the domain (a portfolio shouldn't get dashboard layouts; a law firm shouldn't get neon palettes).

Skip the fourth "what vibe?" question. The three visual picks already encode the mood.

## Generate three directions

Generate three rendered design directions. The palette, type pair, and layout the user just picked are LOCKED across all three — hard constraints, no drift. The three vary only in composition, density, hierarchy, emphasis, and motion register.

The captured screenshot must ride along on this call as a real visual reference, not as prose. The directions step expects an image input; if you describe the screenshot in a free-text context field instead, the call will refuse with a missing-context warning. When that happens, recapture or crop tighter and retry — always through the image-reference path, never through prose. Don't give up and implement directly; loop until the directions land.

Give each direction its own point of view — a sensory metaphor, an energy register, structural moves that make the variants meaningfully distinct from each other. Three flavors of the same locked taste, not three versions of the same composition with a swapped accent color.

## Show the picks

Show the three rendered directions back to the user as real previews — side by side, each one clickable, each one a full rendered artifact. One concise question: "Which direction should I build?" Nothing bundled in, no clarifying disambiguation, no second question hidden inside. Carry the prototype identifiers through from the directions step so the picker resolves to the right rendered output.

## After the user picks

Implement the chosen direction with composition matched exactly — same hero alignment, same component counts, same sectioning, same density. Copy the chosen direction's design tokens verbatim into the project's CSS; don't re-derive values. The prototype is structural reference, not just a mood board.

If the user later asks to see the same pending directions again, present them again without regenerating. If they want fresh ones, restart from "Pin the taste".
