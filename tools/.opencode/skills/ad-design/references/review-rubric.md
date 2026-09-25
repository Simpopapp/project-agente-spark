# Review rubric for ad images

Run against every generated image before presenting it. Inspect at full resolution first, then at a small feed-like view (about 350 px wide). List concrete findings; a pass with zero findings on the first look means look again.

The checklists, transcriptions, and ranking are internal working notes: never reproduce them in chat. Surface a finding to the user only when it needs their decision (a caveat or a trade-off), never as proof that the review ran.

## Mechanical floor (any failure rejects the image)

- Every rendered word matches the approved string set exactly: spelling, casing, punctuation, no extra characters, no invented labels, prices, or logos anywhere in frame.
- Clean images contain no text, logo, badge, watermark, CTA, or frame.
- The logo, when present, is the confirmed logo (the user's existing logo or one they explicitly approved), unaltered.
- Product matches the canonical reference asset opened side by side: shape, proportions, label layout, colors, visible contents. Near-identical is the bar; a merely similar pack is a different product and rejects the image. A drifted product re-rolls grounded on the reference.
- Colors come from the brand or the approved reference; no stray accent pulled from nowhere.
- The product, faces, and the words that carry the message sit inside the center 80% of the canvas (the platform serving crop); type bleeding off an edge passes only as a deliberate cropped-poster move whose message stays unambiguous. A word cut mid-glyph or touching the frame edge fails.
- Any manually cropped or resized file gets re-inspected at its final dimensions before presenting; the pre-crop render passing means nothing.
- Text contrasts with its actual local background; a headline melting into a busy area fails.
- Typography-led images: the type is part of the scene, not a layer on it. If the headline sits on its own solid band or in an empty zone, and cropping the text away would leave a complete photograph, reject and re-plan the composition. Passing requires at least one physical tie between type and subject: overlap or occlusion, a cast shadow or reflection crossing between them, shared surface texture and grain, or matched perspective on the same plane. An inset or framed photograph counts as a separate layer unless type or product crosses the frame. Exception: a plan that names a deliberate flat-poster treatment passes without a scene tie, but then one shared texture or printed grain must unify type and image.
- Occlusion keeps the message readable: every word's first and last letters visible, no word more than about a third hidden. A word swallowed by the subject fails even when its glyphs are correct; fix by shifting the subject or the type, not by shrinking the message.
- Brand and business names anywhere in frame (the headline, a sign, a label, UI text inside a supplied capture) match their source asset letter for letter; a plausible respelling of the user's own name is still a reject.
- Hands, faces, and anatomy are plausible; no garbled fingers or uncanny skin.
- Full resolution is sharp; no blur, pixelation, or bad cropping.
- No border or frame around the image; the composition bleeds to the full canvas.
- A product floating on a sterile all-white digital sweep fails; settings are physical, with organic shadow and light.

## Judgment pass

- Thumbnail test: at a feed-size view (about 350 px), transcribe every string you can actually read, then name what reads first, second, third. An approved string that cannot be transcribed at that size is a finding; no obvious first read is a finding.
- One message: the image argues exactly one thing, and it is the direction's proposition.
- Pattern executed: the image realizes its planned composition pattern, not one of the generic defaults the skill names.
- Distinctive: would this be mistaken for any competitor's ad if the logo were covered? If yes, the direction's signature element is missing.
- Treatment purity: clean or typography-led, never an accidental hybrid.
- Overlay test: could this image be reproduced by adding text to a stock photo in an editor? If yes, the design failed even when every mechanical check passes: re-plan with the type interlocking the subject (occlusion, warp around the silhouette, or in-world placement), not coexisting beside it.

## Set pass (before presenting any set)

- Write the filled checklist for each image, every floor item answered with a concrete observation; a silent pass is not a pass.
- Rank the set strongest to weakest and name the weakest image's weakest element. Ranking is mandatory even when every image passes.
- No source photograph, staged scene, or texture carries more than two images in the set.
- Each aspect ratio includes at least one overlay-free clean image (the safe default for an ad image set) unless the user explicitly agreed to ship without one.

## Loop

1. List every finding from both passes.
2. Fix the worst finding first: refine the existing composition (focal point, hierarchy, palette, clear zone) rather than adding elements.
3. Wrong glyphs get one re-roll with an explicit render-this-exact-text instruction; a second failure cuts the string or converts the slot to a clean image.
4. Re-inspect after every fix; a fix in one zone routinely breaks another.
5. Stop when a full pass over both checklists is clean.
