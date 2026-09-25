# Lovable report house style

Overlap: `interactive-report.md` owns what the report must carry and how it is written and verified; this file owns how it looks. It applies to any standalone HTML report the skill generates, and it yields to an explicit styling request from the user. `marketing-memory`'s `scripts/build_competitor_research.py` carries a copy of these values as the shell of the saved competitor research document.

The report is one self-contained file: no external assets, no webfonts, no framework. The values below are copied rather than imported because such a file cannot reach the app stylesheet; `packages/ui/styles/new-tokens.css` is their source, and `web/modules/chat/workspace/components/HtmlVisualizationFrame/visualizationBaseCss.ts` is the same copy made for sandboxed visualizations.

Aim for quiet, warm-neutral, and precise — recognisably Lovable without imitating the product UI.

## Color

Every color is OKLCH. The neutral scale is a warm gray: hue about 107, chroma at or near zero. No surface reaches pure black or white, and no color is mixed by hand outside the values below — dark-mode primary text is the one token that sits at full lightness.

Declare the neutrals as custom properties on `:root`:

| Property         | Light                          | Dark                              | Use                              |
| ---------------- | ------------------------------ | --------------------------------- | -------------------------------- |
| `--bg-page`      | `oklch(96.99% 0 107)`          | `oklch(23% 0.002 107)`            | page background                  |
| `--bg-card`      | `oklch(98.51% 0 107)`          | `oklch(24.74% 0.002 107)`         | cards and panels                 |
| `--bg-elevated`  | `oklch(99.99% 0 107)`          | `oklch(27.2% 0.002 107)`          | table header rows, chips         |
| `--bg-sunken`    | `oklch(95.49% 0 107)`          | `oklch(20.42% 0.002 107)`         | wells, where one is needed       |
| `--fg-primary`   | `oklch(10% 0 0)`               | `oklch(100% 0 0)`                 | headings, key numbers            |
| `--fg-secondary` | `oklch(30% 0.001 107)`         | `oklch(90.95% 0.002 107)`         | body text                        |
| `--fg-tertiary`  | `oklch(50% 0.001 107)`         | `oklch(72.34% 0.002 107)`         | labels, captions, metadata       |
| `--border`       | `oklch(85% 0 107 / 0.4)`       | `oklch(34.74% 0.004 107 / 0.4)`   | every hairline, alpha included   |

Cards sit lighter than the page in both modes.

Intent colors carry status and never decoration. The solid value is shared across modes; the text value differs:

| Intent      | Solid                             | Text, light                       | Text, dark                        |
| ----------- | --------------------------------- | --------------------------------- | --------------------------------- |
| accent      | `oklch(52.43% 0.2396 264.41)`     | `oklch(43.93% 0.2138 264.41)`     | `oklch(70.62% 0.1391 264.41)`     |
| destructive | `oklch(58.53% 0.2203 26.56)`      | `oklch(49.84% 0.197 26.56)`       | `oklch(76.15% 0.1564 26.56)`      |
| positive    | `oklch(54.42% 0.1689 138.23)`     | `oklch(45.82% 0.1382 138.23)`     | `oklch(72.92% 0.155 138.23)`      |
| attention   | `oklch(58.01% 0.1819 40.04)`      | `oklch(49.33% 0.1528 40.04)`      | `oklch(75.82% 0.1594 40.04)`      |

A badge or callout fill is the solid value at alpha 0.16 light, 0.2 dark. A tint covering a whole panel takes half that — 0.08 light, 0.1 dark — since the full value reads muddy over a large area, particularly in dark mode.

An intent border is its own value rather than the solid at alpha, because the light-mode border is lighter and less saturated than the solid it accompanies:

| Intent      | Border, light                        | Border, dark                         |
| ----------- | ------------------------------------ | ------------------------------------ |
| accent      | `oklch(61.32% 0.2106 264.41 / 0.4)`  | `oklch(52.43% 0.2396 264.41 / 0.4)`  |
| destructive | `oklch(67.3% 0.2102 26.56 / 0.4)`    | `oklch(58.53% 0.2203 26.56 / 0.4)`   |
| positive    | `oklch(63.46% 0.168 138.23 / 0.4)`   | `oklch(54.42% 0.1689 138.23 / 0.4)`  |
| attention   | `oklch(66.84% 0.1815 40.04 / 0.4)`   | `oklch(58.01% 0.1819 40.04 / 0.4)`   |

At most one accent moment per page. Everything else is neutral.

## Light and dark

Support both. Define light on `:root`, override under `@media (prefers-color-scheme: dark)`, and override again on `[data-theme="dark"]` and `[data-theme="light"]` so a host can force a mode. Give `body` an explicit `background: var(--bg-page)`.

## Type

`ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` for text, and `ui-monospace, "Roboto Mono", monospace` for identifiers and code. The brand font is not distributable, so link no webfont.

Body is 400 and emphasis is 500 to 600; nothing reaches 700. The page title is 24 to 28px at 600, body 14 to 15px at a line height near 1.6.

Section labels are the primary sectioning device — 12 to 13px, weight 500, `--fg-tertiary`, sentence case. Prefer them to large bold headings.

Numbers in tables and stat tiles take `font-variant-numeric: tabular-nums` and align right in their column.

Sentence case everywhere. No uppercase text anywhere in the report, and no letter-spacing to compensate.

## Layout

One centred column at `max-width: 960px`, `margin-inline: auto`, 32px of side padding and about 64px above. Spacing follows a 4px grid: 48 to 64px between sections, 16 to 24px inside a panel.

Prose sits directly on the page background; do not box every paragraph, and do not centre body text.

## Panels, tables, badges

A panel is `var(--bg-card)` behind a 1px `var(--border)` at `border-radius: 12px`; chips and small controls take 8px. Elevation comes from the background step and the hairline, so static content carries no drop shadow.

A table lives inside a panel, its rows divided by hairlines in the border token and no zebra striping. The header row uses the section-label treatment, optionally over `--bg-elevated`.

A status badge is a pill at `border-radius: 999px`: tinted intent background, intent text color, its 1px intent border from the table above, 12px, weight 500, sentence case, padding about 2px 10px — "Policy limited", not "POLICY LIMITED".

A stat tile is a small panel: micro-label above, then the number at 24 to 28px in `--fg-primary`.

A callout is an ordinary fully-bordered panel, optionally over a tinted intent background, with its heading and body in the neutral text colors so the tint and border carry the intent alone. Never mark it with a colored left-border strip.

## What to leave out

Each of these costs attention the figures need, and the treatment named above replaces it:

- A colored left-border accent strip on a callout — use the full border and tint.
- Emoji in a heading, label, or status, and icon fonts — use the section label and the badge.
- Gradients, glassmorphism, glows, and hero banners — use the background step.
- A drop shadow on static content — use the hairline border.
- Zebra-striped rows — use the row hairline.
