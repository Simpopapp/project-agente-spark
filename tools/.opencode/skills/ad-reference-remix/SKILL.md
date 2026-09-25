---
name: ad-reference-remix
description: Use when the user shows an ad they like and wants one like it for their own product or app. They provide or select an ad image, poster, social graphic, or display ad as the layout reference to adapt into an on-brand ad creative. Plain asks count too, e.g. "make me one like this" or "can my ad look like this".
---

# Reference ad adaptation

Extends `ad-design` for a selected reference image. It does not replace creative-direction approval, copy another brand's identity, or publish a campaign.

## Preparation

1. Collect one reference image, the verified product photo or app screenshot to feature, and the selected visual treatment; for a typography-led treatment, also the approved message. Ask for a real source asset when none exists; do not substitute a generic stand-in.
2. Inspect the reference at full size. Record its canvas, focal point, product or UI zone, hierarchy, text zones, whitespace, palette, and signature compositional device.
3. Retain only the composition, hierarchy, and visual energy. Remove and replace every competitor product, logo, name, claim, price, testimonial, and readable text. Never reuse a distinctive character, copyrighted photograph, or brand mark; build a new composition from the reference anatomy instead.

## Generation and checks

1. Use `imagegen--edit_image` with the reference and the real product or app source; pass explicit width and height for the target ratio, else output inherits the reference's dimensions. Save every attempt to a new path under `/mnt/documents/ads/`; never overwrite the reference or source asset. Tell the edit model to preserve the recorded layout while replacing the featured asset with the supplied source and clearing all foreign branding.
2. **Clean image:** remove every text and logo zone; add no logo, badge, CTA, label, watermark, or decorative frame.
3. **Typography-led:** set the exact approved message where the reference carried its text, and carry over the reference's own physical tie between type and subject, or add one per `ad-design`'s typography rules. A reference whose text merely sits in its own zone is a layout to improve, not a law to reproduce. Inspect at full size; keep an integrated result that is exact and legible. On a failed review, make another model-first edit with the real source asset, clear type zone, and approved hierarchy; never layer a renderer over the image.
4. Compare the full-resolution output with the reference and the real source asset. Reject residual competitor identity, a distorted product or UI, wrong product colors, an altered logo, illegible text, an unsupported claim, or an accidental clean/type-led hybrid. Restart from the original reference when regenerating.
5. After the user approves the first remix direction, create each required aspect ratio as its own composition, following `ad-design`'s clean-image-per-aspect-ratio default and its fully-typography-led trade-off rule.

## Presentation

Show the first remix direction, explain which reference qualities carried over and which brand elements changed, and wait for approval before expanding into the full image set.
