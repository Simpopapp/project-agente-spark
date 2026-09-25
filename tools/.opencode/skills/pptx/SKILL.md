---
name: pptx
# Selection is embedding-scored against this description. It is anchored on
# .pptx FILE operations and deliberately avoids bare "deck"/"slides"/
# "presentation" vocabulary so a generic deck ask routes to the slides-app
# knowledge (React app path) instead of this skill. Routing guidance for the
# agent lives in the skill body.
description: "Work with .pptx PowerPoint files: read, parse, or extract text from an existing .pptx; edit or update a .pptx; combine or split .pptx files; work with .pptx templates, layouts, speaker notes, or comments; or create a new .pptx file when the user explicitly requests a PowerPoint file."
---

# PPTX Skill

> **Skill scripts must be copied to a local path before execution.** Copy each script from the read-only mirror `/tmp/knowledge/skill/` to `/tmp/` with `code--exec` `cp`, then run with `code--exec`. Use `code--view` for reading files — not bash tools like `cat` or `ls`.

**When NOT to use this skill:** if the user asked for a deck, slides, or a presentation without explicitly requesting a PowerPoint/.pptx file, build a React slides app instead (slides-app knowledge) — it previews live in Lovable and exports a pixel-faithful PDF via its print route.

## Task Routing

| Task | Guide |
|------|-------|
| Read/analyze content | `python -m markitdown presentation.pptx` |
| Edit or create from template | Read [template_editing_guide.md](knowledge://skill/pptx/template_editing_guide.md) |
| Create from scratch | Read [pptxgenjs_reference.md](knowledge://skill/pptx/pptxgenjs_reference.md) |

---

## Inspecting Content

```
# Extract slide text
code--exec python -m markitdown presentation.pptx

# Generate visual overview (imports the office/ sibling package — copy scripts/ whole)
code--exec cp -r /tmp/knowledge/skill/pptx/scripts /tmp/pptx-scripts
code--exec python /tmp/pptx-scripts/generate_thumbnail_grid.py presentation.pptx

# Access raw XML (office/ scripts import sibling packages — copy the whole dir)
code--exec cp -r /tmp/knowledge/skill/pptx/scripts/office /tmp/office
code--exec python /tmp/office/extract_document.py presentation.pptx unpacked/
```

---

## Editing Workflow

**Read [template_editing_guide.md](knowledge://skill/pptx/template_editing_guide.md) for full details.**

1. Analyze template with `generate_thumbnail_grid.py`
2. Unpack → manipulate slides → edit content → clean → pack

---

## Creating from Scratch

**Read [pptxgenjs_reference.md](knowledge://skill/pptx/pptxgenjs_reference.md) for full details.**

Use when no template or reference presentation is available.

---

## Design Guidance

**Avoid generic, visually flat slides.** Plain bullets on a white background won't impress anyone. Consider ideas from this list for each slide.

> The project's design-token rules (semantic CSS tokens, no raw hex) apply to app code only. pptxgenjs colors are literal 6-character hex strings without `#` — do not carry CSS token guidance into `.pptx` generation.

**Content integrity.** Never invent figures, metrics, quotes, customer names, or citations for a deck. Use only numbers the user supplied or that tools produced in this conversation. Where a real number is needed but unknown, insert a visibly marked placeholder (e.g. `[Q3 REVENUE — replace]`) and tell the user which placeholders need real data.

### Before Starting

- **Pick a bold, content-informed color palette**: The palette should feel designed for THIS topic. If swapping your colors into a completely different presentation would still "work," you haven't made specific enough choices.
- **Dominance over equality**: One color should dominate (60-70% visual weight), with 1-2 supporting tones and one sharp accent. Never give all colors equal weight.
- **Dark/light contrast**: Dark backgrounds for title + conclusion slides, light for content ("sandwich" structure). Or commit to dark throughout for a premium feel.
- **Commit to a visual motif**: Pick ONE distinctive element and repeat it — rounded image frames, icons in colored circles, thick single-side borders. Carry it across every slide.

### Color Palettes

Choose colors that match your topic — don't default to generic blue. Use these palettes as inspiration:

| Theme | Primary | Secondary | Accent |
|-------|---------|-----------|--------|
| **Midnight Executive** | `1E2761` (navy) | `CADCFC` (ice blue) | `FFFFFF` (white) |
| **Forest & Moss** | `2C5F2D` (forest) | `97BC62` (moss) | `F5F5F5` (cream) |
| **Coral Energy** | `F96167` (coral) | `F9E795` (gold) | `2F3C7E` (navy) |
| **Warm Terracotta** | `B85042` (terracotta) | `E7E8D1` (sand) | `A7BEAE` (sage) |
| **Ocean Gradient** | `065A82` (deep blue) | `1C7293` (teal) | `21295C` (midnight) |
| **Charcoal Minimal** | `36454F` (charcoal) | `F2F2F2` (off-white) | `212121` (black) |
| **Teal Trust** | `028090` (teal) | `00A896` (seafoam) | `02C39A` (mint) |
| **Berry & Cream** | `6D2E46` (berry) | `A26769` (dusty rose) | `ECE2D0` (cream) |
| **Sage Calm** | `84B59F` (sage) | `69A297` (eucalyptus) | `50808E` (slate) |
| **Cherry Bold** | `990011` (cherry) | `FCF6F5` (off-white) | `2F3C7E` (navy) |

### For Each Slide

**Every slide needs a visual element** — image, chart, icon, or shape. Text-only slides are forgettable.

**Layout options:**
- Two-column (text left, illustration on right)
- Icon + text rows (icon in colored circle, bold header, description below)
- 2x2 or 2x3 grid (image on one side, grid of content blocks on other)
- Half-bleed image (full left or right side) with content overlay

**Data display:**
- Large stat callouts (big numbers 60-72pt with small labels below)
- Comparison columns (before/after, pros/cons, side-by-side options)
- Timeline or process flow (numbered steps, arrows)

**Visual polish:**
- Icons in small colored circles next to section headers
- Italic accent text for key stats or taglines

### Typography

**Choose an interesting font pairing** — don't default to Arial. Pick a header font with personality and pair it with a clean body font.

| Header Font | Body Font |
|-------------|-----------|
| Georgia | Calibri |
| Arial Black | Arial |
| Calibri | Calibri Light |
| Cambria | Calibri |
| Trebuchet MS | Calibri |
| Impact | Arial |
| Palatino | Garamond |
| Consolas | Calibri |

**Default sizes (apply unless the user requests otherwise).** Slides are projected or shown fullscreen, so body text below ~18pt is hard to read from anywhere but the laptop screen. When in doubt, go bigger and bias toward the top of each range.

| Element | Default size |
|---------|--------------|
| Slide title | 40-54pt bold |
| Section header | 28-32pt bold |
| Body text | 20-24pt |
| Captions | 14-16pt muted |
| Large stat callouts | 72-120pt |

First instinct when body content doesn't fit at the default size: cut content or split slides. If the user explicitly asks for smaller text or denser slides, follow that instead.

### Spacing

- 0.5" minimum margins
- 0.3-0.5" between content blocks
- Leave breathing room—don't fill every inch

### Avoid (Common Mistakes)

- **Don't repeat the same layout** — vary columns, cards, and callouts across slides
- **Don't center body text** — left-align paragraphs and lists; center only titles
- **Don't skimp on size contrast** — titles need 40pt+ to stand out from 20-24pt body
- **Don't reflexively shrink text to make content fit** — first try cutting content or splitting the slide. Going below ~18pt body / ~14pt captions hurts projection legibility, so do it only when the user explicitly asks for denser slides
- **Don't default to blue** — pick colors that reflect the specific topic
- **Don't mix spacing randomly** — choose 0.3" or 0.5" gaps and use consistently
- **Don't style one slide and leave the rest plain** — commit fully or keep it simple throughout
- **Don't create text-only slides** — add images, icons, charts, or visual elements; avoid plain title + bullets
- **Don't forget text box padding** — when aligning lines or shapes with text edges, set `margin: 0` on the text box or offset the shape to account for padding
- **Don't use low-contrast elements** — icons AND text need strong contrast against the background; avoid light text on light backgrounds or dark text on dark backgrounds
- **NEVER use accent lines under titles** — these are a hallmark of AI-generated slides; use whitespace or background color instead

---

## Quality Assurance (Mandatory)

**Treat every render as containing defects until proven otherwise.**

Your first render is almost never correct. Approach QA as a bug hunt, not a confirmation step. If you found zero issues on first inspection, you weren't looking hard enough.

### Schema Validation

Validate every generated or edited `.pptx` before delivery — the pptxgenjs path produces files PowerPoint can reject, and a deck that fails validation must never be delivered to `/mnt/documents`. Copy the whole `office/` directory: `validate_document.py` imports its sibling `validators/` package, so copying the single file fails with ModuleNotFoundError.

```
code--exec cp -r /tmp/knowledge/skill/pptx/scripts/office /tmp/office
code--exec python /tmp/office/validate_document.py output.pptx --auto-repair
```

### Textual Verification

```bash
python -m markitdown output.pptx
```

Check for missing content, typos, wrong order.

**When using templates, check for leftover placeholder text:**

```bash
python -m markitdown output.pptx | grep -iE "xxxx|lorem|ipsum|this.*(page|slide).*layout"
```

If grep returns results, fix them before declaring success.

### Visual Inspection

Do visual QA even for 2-3 slides. You've been staring at the code and will see what you expect, not what's there.

Convert slides to images (see [Rendering Slides as Images](#rendering-slides-as-images)) and the inspect using the read tool focusing on: 

- Overlapping elements (text through shapes, lines through words, stacked elements)
- Text overflow or cut off at edges/box boundaries
- Decorative lines positioned for single-line text but title wrapped to two lines
- Source citations or footers colliding with content above
- Elements too close (< 0.3" gaps) or cards/sections nearly touching
- Uneven gaps (large empty area in one place, cramped in another)
- Insufficient margin from slide edges (< 0.5")
- Columns or similar elements not aligned consistently
- Low-contrast text (e.g., light gray text on cream-colored background)
- Low-contrast icons (e.g., dark icons on dark backgrounds without a contrasting circle)
- Text boxes too narrow causing excessive wrapping
- Leftover placeholder content

IMPORTANT! Do not use browser tools for artifact QA.

For each slide, list issues or areas of concern, even if minor.

Read and analyze these images:
1. /path/to/slide-01.jpg (Expected: [brief description])
2. /path/to/slide-02.jpg (Expected: [brief description])

Report ALL issues found, including minor ones.

### Iterative Review Cycle

1. Generate slides → Convert to images → Inspect
2. **List issues found** (if none found, look again more critically)
3. Fix issues
4. **Re-verify affected slides** — one fix often creates another problem
5. Repeat until a full pass reveals no new issues

**MAKE SURE** you summarise your QA process by listing any issues you found and how you fixed them. If you found no issues, state that explicitly.

**Do not declare success until you've completed at least one fix-and-verify cycle.**

---

## Images in Generated .pptx

Always embed images as base64 data — never use file path references. LibreOffice cannot resolve file paths during PDF conversion, which breaks visual QA.

```js
// CORRECT: embed as base64
const imgData = fs.readFileSync('/path/to/image.jpg');
slide.addImage({ data: `image/jpeg;base64,${imgData.toString('base64')}`, x: 0, y: 0, w: 10, h: 5.63 });

// WRONG: path reference — breaks PDF conversion
slide.addImage({ path: 'src/assets/image.jpg', x: 0, y: 0, w: 10, h: 5.63 });
```

---

## Rendering Slides as Images

Convert presentations to individual slide images for visual inspection:

```
code--exec cp /tmp/knowledge/skill/pptx/scripts/office/run_libreoffice.py /tmp/run_libreoffice.py
code--exec python /tmp/run_libreoffice.py --headless --convert-to pdf output.pptx
code--exec pdftoppm -jpeg -r 150 output.pdf slide
```

This creates `slide-01.jpg`, `slide-02.jpg`, etc.

To re-render specific slides after fixes:

```bash
pdftoppm -jpeg -r 150 -f N -l N output.pdf slide-fixed
```

---

## Dependencies

- `pip install "markitdown[pptx]"` - text extraction
- `pip install Pillow` - thumbnail grids
- `npm install -g pptxgenjs` - creating from scratch
- LibreOffice (`soffice`) - PDF conversion (auto-configured for sandboxed environments via `knowledge://skill/pptx/scripts/office/run_libreoffice.py`)
- Poppler (`pdftoppm`) - PDF to images
