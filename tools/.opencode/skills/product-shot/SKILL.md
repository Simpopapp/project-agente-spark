---
name: product-shot
description: "Use this skill when the user wants to create a product shot, app screenshot mockup, or marketing image of their application. Triggers on requests like 'create a product shot', 'make a screenshot mockup', 'marketing screenshot', 'app preview image', 'window mockup', or 'hero image of my app'. The skill takes a screenshot and wraps it in a macOS-style window frame with gradient background, rounded corners, and drop shadow using Python Pillow."
---

# Product Shot Generator

> **Scripts cannot be run directly from `knowledge://` paths.** Copy the script from the read-only mirror `/tmp/knowledge/skill/` to `/tmp/` with `code--exec` `cp`, then run with `code--exec`. Use `code--view` for reading files — not bash tools like `cat` or `ls`.

## Overview

This skill places your app screenshot inside a macOS-style window frame with traffic light buttons, rounded corners, drop shadow, and a mesh gradient background.

## Steps

1. **Get the screenshot**: Save a new app screenshot under `/tmp/`, or use a screenshot the user has already provided.
2. **Copy the script** from `knowledge://skill/product-shot/generate.py` to `/tmp/generate.py` using `code--exec` `cp` from the `/tmp/knowledge/skill/` mirror.
3. **Render a preview** with `code--exec`. Use a new preview path if the example path already exists:

```bash
code--exec python /tmp/generate.py /path/to/screenshot.png /tmp/product-shot-preview.png
```

4. **Inspect and revise**: View the preview and reuse its path for refinements.
5. **Deliver only the accepted image**: Save standalone deliverables to `/mnt/documents/` (Files). For outputs the app displays or serves, generate under `/tmp/`, add them only as project assets with `lovable-assets`, and use them in the app. Add a Files copy only if the user asks for one. Follow an explicit destination. Remove this task's separate preview after delivery. Keep scripts and raw captures under `/tmp/`.

### Gradient Presets

The script includes 10 mesh gradient presets. Use `--preset` to select one:

| Preset | Description |
|--------|-------------|
| `sunset` | Warm pink-coral to soft blue (default) |
| `ocean` | Deep dark teals and navy |
| `aurora` | Rich greens fading to dark teal |
| `candy` | Playful pink, peach, and rose |
| `midnight` | Deep indigo and dark purple |
| `fog` | Subtle silver-gray tones |
| `peach` | Soft peach, salmon, and blush |
| `arctic` | Cool light blues and soft whites |
| `ember` | Fiery red, orange, and yellow |
| `lavender` | Purple gradients from soft lilac to vivid violet |

Pick the preset that best matches the user's app aesthetic or request. If they don't specify, choose one that complements their app's color scheme.

### Customization Options

```bash
code--exec python /tmp/generate.py <input> <output> [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--preset` | `sunset` | Gradient preset name (see table above) |
| `--gradient` | — | Custom mesh gradient: 2-5 comma-separated hex colors. Overrides `--preset`. |
| `--padding` | `80` | Padding around the window frame in pixels |
| `--corner-radius` | `12` | Corner radius for the window frame |
| `--shadow-radius` | `30` | Gaussian blur radius for the drop shadow |
| `--shadow-opacity` | `80` | Shadow opacity (0-255) |
| `--title-bar-height` | `36` | Height of the macOS title bar |

### Examples

Sunset preset (default):
```bash
code--exec python /tmp/generate.py /tmp/screenshot.png /tmp/product-shot-preview.png
```

Aurora preset with extra padding:
```bash
code--exec python /tmp/generate.py /tmp/screenshot.png /tmp/product-shot-preview.png --preset aurora --padding 120
```

Custom 3-color mesh gradient:
```bash
code--exec python /tmp/generate.py /tmp/screenshot.png /tmp/product-shot-preview.png --gradient "#FF6B6B,#4ECDC4,#2C3E50"
```

Dark midnight with subtle shadow:
```bash
code--exec python /tmp/generate.py /tmp/screenshot.png /tmp/product-shot-preview.png --preset midnight --shadow-opacity 40
```
