# Composition patterns for ad images

Named compositions with prompt skeletons. Pick one per image and name it in the image's plan. Slots: {aspect} the required aspect ratio, {PRODUCT} the real product or UI grounded on its canonical reference asset, {HEADLINE} the approved primary message, {BRAND WORD} the brand's own name or product word, {CHIP1}-{CHIP3} short user-approved supporting strings, {FIELD} the background color, {INK} the type color, {ACCENT} one brand accent, {TYPE FEEL} the brand's observed type treatment (for example "high-contrast editorial serif" or "heavy condensed grotesque"). Resolve every slot from the brief or the user-approved string set; never invent a color, string, or logo to fill one. Lowercase braced fills ({ingredients}, {liquid}) are scene content, not rendered text.

## Constructions

The content structures an ad can be built on; pick one per direction.

- **Product or UI demonstration:** the real product or a real screen is the proof.
- **Problem and answer:** the customer-stated problem, then the product's supported answer.
- **Outcome or contrast:** a defensible before/after or old/new contrast.
- **Proof:** a real metric, review, press quote, or customer result with its source.
- **Feature explanation:** a product detail or real UI, explaining only the deciding capability.
- **Identity or lifestyle:** the product in a credible, audience-relevant moment; the image carries the message.
- **Comparison:** one factual, substantiated difference, when comparison is appropriate.

## Prompt ingredients (every pattern)

- Targeted avoid-lines only: "no extra text", "no invented logos or labels", "no watermark". No long negative lists.
- When a skeleton includes {ACCENT}, use it exactly once; no accent element in a clean-image pattern.
- People: natural skin texture, slight asymmetry; aim the gaze at the product or headline, not the camera.
- At most one texture or print-process reference per image (letterpress impression, screen-print ink, risograph grain): stacked textures muddy the render, and a process reference is a lever for one image, never a house style for the set.
- Give letterforms a material and the scene's own light: "matte ink soaked into the paper", "dimensional letters with contact shadows on the wall", "neon spilling color onto the wet pavement". Type with no named material and no named light source renders as a pasted layer.
- Layered type (an oversized background brand word, a dominant headline, a supporting line, small chips) is allowed when the register carries the density and the hierarchy stays legible in a glance. Strings past ~25 characters and layouts past about three distinct strings degrade fast in every current model; a headline of four words or fewer is the reliable zone.
- Name a bounded style anchor (editorial magazine cover, Swiss poster grid, hand-painted sign) when the brief supports one. A reference photograph is one candidate stage, not the default; a fresh scene built for the message routinely beats the source backdrop.

## Clean-image patterns (no rendered text)

### Product hero
The product alone against a considered background, nothing else competing. The ad-set workhorse; one per aspect ratio is the safe default unless the user explicitly chose to ship without clean images.
Skeleton: "{aspect} advertising photograph. {PRODUCT} centered on {FIELD}, physical set with organic shadows and directional studio light, {two or three material details}, generous negative space. No text, logo, badge, label, watermark, or graphic."
Watch for: sterile pure-white sweeps (use a real surface), product drift when not grounded on the supplied photo.

### Interface hero
For software the screen is the product: a real capture inside a laptop, phone, or thin browser frame, staged with `imagegen--edit_image` so the pixels stay authentic. Replaces Product hero as the workhorse for SaaS and digital services.
Skeleton: "{aspect} advertising image. The supplied screenshot inside a {device or thin browser} frame at a slight perspective tilt, floating over {FIELD} with a soft contact shadow, {one or two environment details}. Preserve the screenshot exactly; do not redraw, retype, or add interface elements. No other text."
Watch for: the model retyping UI text (compare against the capture side by side), invented buttons or charts, a capture too dense to read at feed size (crop it to one legible feature first).

### Lifestyle in-context
The product inside a credible moment of the audience's life; the scene carries the message.
Skeleton: "{aspect} advertising photograph. {audience-true person or setting} using {PRODUCT} in {specific place}, {time-of-day light}, candid framing, product label readable. Natural skin texture, slight asymmetry. No text or graphic overlays."
Watch for: uncanny faces and hands, the wrong product in hand, stock-photo blandness (specificity in the scene nouns is the antidote).

### Floating hero
Studio-surreal render: the product levitating with its ingredients or parts in orbit, frozen motion, physics-plausible light. Works clean; carrying a rendered line makes it typography-led and subject to those rules.
Skeleton: "{aspect} advertisement, zero-gravity composition on {FIELD}. {PRODUCT} floating at a slight diagonal, {ingredients or components} suspended in orbit around it, frozen {splash or pour} mid-air, directional softbox light, sharp foreground."
Watch for: ingredients inheriting wrong colors, the product stretching or squashing; compare against the real pack shot.

## Typography-led patterns (rendered text integrated into the scene)

Type and subject physically interact in every pattern here. Each image shows at least one of: the subject overlapping or occluding letterforms, the type warping or flowing around the subject's silhouette, the words rendered in-world on a surface in the scene, or type and subject sharing one texture, grain, and lighting on the same plane. Words and photograph merely occupying separate zones fails the pattern regardless of spelling, contrast, or hierarchy. An inset or framed photograph inside a type layout counts as separate zones unless something crosses the frame: type descending into the photo, the product breaking out of it, or one continuous grain unifying both. Calibration: a coiled inner tube nested inside a giant arced didone "Punktering?", rubber and letters sharing one aged-paper grain, meets the bar; a solid strip carrying a serif caption above an untouched photograph fails. Occlusion legibility: hide letters only mid-word behind the subject's widest part, keep every word's first and last letters visible, never hide more than about a third of a word. One integration device per image; a heavy device (letterforms built from scene matter, perspective-mapped text) caps the message at three words.

### Type interleave
A giant headline behind and around the product; letters partially occluded by it, the product's shadow falling on the type. The editorial look.
Skeleton: "{aspect} editorial advertisement on {FIELD}. The words \"{HEADLINE}\" set enormous in {TYPE FEEL}, {INK}, filling the canvas; {PRODUCT} overlaps and partially hides the letterforms, soft shadow cast onto the type. Text verbatim, crisp, no other text."
Watch for: occlusion swallowing whole words (the message must survive the overlap), type flattening into a pasted layer with no shared lighting.

### In-world text
The message exists physically inside the scene: marker on a newspaper, chalk on a board, letters formed in dust or steam, a hand-painted shop sign.
Skeleton: "{aspect} advertising photograph. {scene with {PRODUCT} present}. The words \"{HEADLINE}\" written {material and method: in red marker across the newspaper page, in wiped dust on the dark shelf}, matching the scene's perspective and light. Text verbatim; no other text in frame."
Watch for: phrases beyond about five words degrade fast here; the writing must inherit the surface's texture and perspective or it reads pasted.

### Cut-out window type
The headline set huge with the scene visible only inside the letterforms; the type is the window.
Skeleton: "{aspect} typographic poster, solid {FIELD} background. Bold {TYPE FEEL} letters spell \"{HEADLINE}\", filling the frame; the letters act as cut-out windows revealing {product scene} inside the letterforms only. Text verbatim, no other text."
Watch for: thin typefaces leave the scene unreadable; works best with three or fewer words in a heavy weight.

### Editorial poster grid
Structured print-poster composition: type dominates one zone, a photographic element sits on a disciplined grid in another.
Skeleton: "{aspect} poster in a Swiss typographic grid on {FIELD}. \"{HEADLINE}\" set enormous in {TYPE FEEL}, {INK}, tight leading, filling the upper two thirds; {PRODUCT} photograph placed on the baseline grid in the lower third, one edge of the product breaking across the zone boundary into the descenders of the type; type and photograph unified by one continuous paper texture and print grain over the whole poster. One thin {ACCENT} rule. Flat, printed, matte. Text verbatim, one small caption maximum, no other text."
Watch for: the model centering everything anyway (restate the zone split), the two zones reading as separate pasted layers; when the product does not cross the boundary and the paper grain does not unify them, the image is the banner-caption failure, not this pattern.

### Energetic promo stack
High-energy FMCG poster: an oversized brand word as a background type layer behind the product, ingredients and a frozen splash suspended mid-air, a stacked bold headline, a compact chip row anchoring the bottom. The density must be earned by a playful register; never use it for a premium-minimal brand.
Skeleton: "{aspect} high-energy product poster on {FIELD}. The word \"{BRAND WORD}\" repeated oversized in {TYPE FEEL} as a background type layer, partially hidden behind the product; {PRODUCT} large in the center with {ingredients} and a frozen {liquid} splash suspended around it; \"{HEADLINE}\" stacked bold to one side; a bottom row of three short chips \"{CHIP1}\" \"{CHIP2}\" \"{CHIP3}\". All text verbatim, crisp; no other text."
Watch for: chip glyphs failing at small sizes (inspect at full resolution), the splash swallowing the product silhouette, density spilling outside the center 80% safe area.

### Large brand name
The brand name set as large text on a matte field, the product photographed small and precise like a catalog plate, a thin letterspaced footer line anchoring the base. Restraint is the signature; works from a real site photograph via `imagegen--edit_image`, setting the type into the photo's own light and grain.
Skeleton: "{aspect} editorial poster on {FIELD}. \"{BRAND WORD}\" set enormous in {TYPE FEEL} with wide tracking dominating the upper field; {PRODUCT} small and perfectly lit in the lower field, casting a real shadow onto the poster surface; a thin letterspaced footer line \"{CHIP1}\" at the base. One continuous paper grain over type and photograph. Text verbatim, no other text."
Watch for: the product growing to fill the frame (smallness is the point), footer glyphs failing at small scale.

### Orbit callouts
The product centered with small letterspaced labels orbiting it, hairline pointers connecting each label to the feature it names. Technical-catalog precision; the labels are the design element. A hand-drawn variant swaps hairlines for marker arrows, a doodled circle around one detail, and short handwritten labels; same rules, looser voice, and the handwriting must read as one person's real marker on the print, not a font.
Skeleton: "{aspect} technical advertising poster on {FIELD}. {PRODUCT} large in the center; thin hairline pointers connect three small letterspaced labels \"{CHIP1}\" \"{CHIP2}\" \"{CHIP3}\" orbiting the product to the details they name; \"{HEADLINE}\" set bold across the top. Labels share the poster's ink and grain. All text verbatim, no other text."
Watch for: label glyphs failing at small sizes, pointers that touch nothing.

### Kinetic type
Letters in motion: the headline's characters scattered, rotated, or streaming around the product as if caught mid-animation, some occluded by it. High energy; earns a dense, playful register.
Skeleton: "{aspect} high-energy poster on {FIELD}. The word \"{HEADLINE}\" exploded across the canvas in {TYPE FEEL}, characters at shifting scales and rotations flowing around and behind {PRODUCT}, several letters partially occluded by it, slight motion blur on the outermost glyphs. Text verbatim and legible in reading order, no other text."
Watch for: legibility collapsing (the word must still read at feed size), duplicated glyphs.

### Miniature scale play
A hyper-detailed miniature of the product held between thumb and finger, or oversized in a tiny world. Pattern-interrupt through scale.
Skeleton: "{aspect} advertising photograph, luxury macro style. A miniature but hyper-detailed, brand-accurate {PRODUCT} held between a thumb and index finger, clean {FIELD} backdrop, soft shadows, shallow depth of field. Natural skin texture. No text."
Watch for: label fidelity at miniature scale; ground on the real product image.

## Resolved exemplar

Type interleave for a hand-built oak lounge chair, every slot filled from the brief: "1:1 editorial advertisement on warm cream paper. The words \"Built to be inherited.\" set enormous in a high-contrast editorial serif, charcoal ink, filling the canvas; the oak lounge chair from the supplied photo overlaps and partially hides the letterforms, its soft shadow falling across the type; chair and letters share one paper grain and the same window light. Text verbatim, Title Case, no other text, no logo, no watermark."

## Pattern selection

- Kickoff chose clean: pick among the clean patterns; vary them across the set.
- Kickoff chose typography-led: give the primary message one type pattern; the set's clean images still come from the clean patterns.
- Match pattern to construction: proof and feature constructions want the product legible (hero, interleave); identity constructions want lifestyle or in-world text; outcome constructions pair with floating hero or editorial grid.
- Match pattern to register: energetic brands reach for promo stack, kinetic type, floating hero, and scale play; restrained brands reach for large brand name, editorial grid, interleave, and hero; precision-led products (tech, gear, instruments) reach for orbit callouts. The register decides, not habit.
- Software or digital service: Interface hero is the workhorse, and the framed real capture stands in for {PRODUCT} in the type patterns. Never swap in a physical object.
- Physical product: studio product-forward is the reliable default offer: Product hero clean, or a typography-led studio play (orbit callouts in the hand-drawn voice, kinetic type, energetic promo stack) on a seamless field. The field color and simple set dressing can change freely between images; the product's fidelity cannot.
