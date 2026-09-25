---
name: ad-design
description: Use when the user wants ad images made, improved, or reviewed for an ad campaign draft, including turning an approved creative direction into finished assets. Covers every campaign image (square, landscape, or portrait; clean-image or typography-led) grounded in the website's product, logo, colors, and visible type treatment. Plain asks count too, e.g. "make the ad images" or "can you fix this ad image".
---

# On-brand ad creative

Extends the ad design workflow for visual treatment and image prompting. It does not replace campaign setup, copy approval, or ad-policy requirements. The ad competes in a feed for one to two seconds: the viewer must catch the brand and the message in one glance.

## The verified brief

1. Inspect the live site, project files, and user-provided assets before proposing creative. Extract only what the sources show: product, approved claims, primary and accent colors, type treatment, photography style, logo rules, and usable product imagery.
2. Before generating previews or ad images, use `questions--ask_questions` to ask whether the user wants to upload more images or inspiration, how existing images should be used, and whether to include added typography. Put your project-grounded recommendation, reason, and useful alternatives in the questions or options. Wait for answers to all three; carry completed answers forward during revisions. Typography means added ad wording, including overlays or words integrated into a scene, not native product or UI text.
3. For a typography-led ad, agree one short, landing-page-supported primary message before generating. Supporting text, a price, or a badge renders only when the user deliberately approved that exact string; site-sourced is not approved, and a price needs the user's explicit confirmation. Keep campaign copy separate from text rendered into an image.

## Construction

1. Load `knowledge://skill/ad-design/references/composition-patterns.md` and pick one construction per direction from the brand's strongest available evidence; the reference lists the constructions and their matching composition patterns.
2. A direction is distinct by proposition, construction, or featured proof. Color, crop, or decoration changes are not new directions.
3. Skip a construction whose proof is unavailable: generate a product, UI, or lifestyle direction instead of inventing a statistic, testimonial, transformation, or competitor claim.
4. Never simulate an interface the ad does not have: no fake play buttons, chat threads, call screens, poll widgets, or notification cards; ad platforms reject non-existent functionality. Real product UI presented as itself is fine.

## The composition plan

Write a one-line plan for every image before its first generation call: composition pattern by name, focal point, palette values from the brand, type roles, and the single element that makes it memorable.

1. Set the set's energy register from the brand's own world and state it in the plan: a playful food, drink, or FMCG brand earns dense, dynamic compositions; a premium or minimalist brand earns restraint and negative space. Lock the register across the set; do not drift to a cozy middle. For a physical product, always offer a studio product-forward register.
2. Software or a digital service: the interface is the product. Make a real capture of the user's app or site the hero and stage the scene around it with `imagegen--edit_image`. Never let the model paint the interface from a description, and never substitute an invented physical object for a digital product. A device or browser frame is fine; the screen inside it is the supplied capture.
3. Physical product: designate one canonical product reference in the plan: the user's photo, else the site's product imagery, else the first user-approved render. Ground every image that shows the product on that asset; a merely similar pack is a different product. With no reference anywhere, say so and get the invented design approved once before generating the set.
4. Pick a named composition pattern per image and vary patterns across the set; keep palette, agreed treatment mix, register, and product fidelity consistent within a direction. Vary the source scenes: at most two images in a set reuse the same source photograph or staged scene. A thin asset library means staging new scenes of the same grounded product, not recycling one photo.
5. When the brief leaves composition open, these default plans need revision before generating:
   - a photograph with a flat color band and a centered caption on it
   - a centered product on a radial-gradient glow with a corner badge
   - text blocks of even size and weight with no reading order
6. Build one unmistakable reading order: what is read first, second, third at feed size. Every string earns its place, every rendered string is user-approved, and the smallest string stays readable at feed size. Text on the product's own packaging comes from the supplied asset and sits outside these limits.
7. Design to the full canvas but keep the product, faces, and every word that carries the message inside the center 80% of the canvas; the platform serving crop eats the edges. Decorative type bleeds off an edge only as a deliberate cropped-poster move whose message stays complete.

## Prompting

1. Start every image that shows the product, UI, or logo from its canonical reference asset with `imagegen--edit_image`. Pass the reference itself as the edit input (a repo path, project document path, chat attachment, or image URL); never download or re-save a source to pass a copy. Use `imagegen--generate_image` only when nothing in frame has a source asset to preserve. Save every render and edit to a new absolute path under `/mnt/documents/ads/`; never overwrite a source asset or an earlier candidate.
2. Order the prompt layout-first: artifact and aspect, then the composition pattern, then subject and scene, then type, then palette and lighting.
3. **Clean image:** describe the selected construction, product, setting, palette, mood, composition, and supplied visual references, with five to twelve concrete scene nouns and material or lighting details instead of empty adjectives. Add an explicit constraint: no text, logo, badge, label, watermark, CTA, frame, or decorative graphic.
4. **Typography-led ad:** ground what must stay real, stage the rest. The product, UI capture, or logo comes pixel-true from its canonical reference via `imagegen--edit_image`. Prompt a recomposition, not an overlay: the scene kept or staged, extended around the subject to make negative space the type owns, the type set into that scene's light, grain, and perspective, with an explicit preserve list (keep the product, its colors, materials, and label exactly the same) repeated in every follow-up edit. With `imagegen--generate_image`, set `model` to `premium`. Wrap every rendered string in quotes with placement, scale, role, and casing, and demand it verbatim: exact spelling, no extra words, no invented labels. Describe type by properties (weight, serif or sans, condensed or wide, tracking) in the brand's observed treatment.
5. Every typography-led prompt names at least one concrete physical tie between words and scene, phrased as depth order (name what sits in front of the words), never as text "on" or "over" the image, and never parks the headline on a solid band or empty margin by default. A deliberately flat treatment is a plan-level choice, not a fallback: it swaps the scene tie for one shared texture or printed grain named in the image's plan.
6. Render all of an image's text as one designed system in the generation itself; text on the product's own packaging comes from the supplied asset and does not count. When a render fails on one string, run a targeted `imagegen--edit_image` fix pass before re-rolling: change only that word to the exact approved spelling, same typeface, size, and lighting. Never patch failed words back as overlays; a string that survives neither a fix pass nor a re-roll moves to campaign copy.
7. Use a logo only as a confirmed source asset (the user's existing logo, or a generated logo the user explicitly approved through the campaign logo step), grounded with `imagegen--edit_image`; never draw a logo directly into an ad scene. With neither, keep the creative logo-free. When the model cannot preserve the approved logo, show the limitation and ask whether to continue with a clean image or another integrated attempt.
8. One clean image per aspect ratio is the safe default for an ad image set, not a mandate. When the direction is strongest fully typography-led, state the trade-off in one line and let the user decide; never silently ship a set with no photographic image. Every selected image is an intentional clean or typography-led composition, never a stray-text hybrid.

## Review

Treat every render as broken until inspection proves otherwise; a first pass with zero findings means the inspection was too shallow. Load `knowledge://skill/ad-design/references/review-rubric.md` and run its full checklist and fix loop against the brief at full size and again at a small feed-like view; the rubric carries the complete checks, the re-roll budget, and the fix loop.

1. Preserve the direction selected in the kickoff. When the user asks for proposed directions or leaves the direction open, present genuinely distinct directions, not minor variants. Keep palette, product fidelity, construction, and the agreed treatment mix consistent within each direction and across its required aspect ratios.
2. Read a rejection that names no direction as a register signal, not a pattern signal: the next candidates span registers (one editorial or restrained, one playful merch or packaging energy, one studio product-forward), never three variations of the rejected mood. On a second rejection, stop generating and calibrate: ask for an ad, poster, or brand the user likes, or offer plain register words to pick from, then rebuild from that answer.
