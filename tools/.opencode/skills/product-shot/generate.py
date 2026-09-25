"""Product shot generator — wraps a screenshot in a macOS-style window frame
with mesh gradient background, rounded corners, and drop shadow.

Usage:
    python generate.py <input_path> <output_path> [options]

Options:
    --preset NAME          Use a preset gradient (sunset, ocean, aurora, candy,
                           midnight, fog, peach, arctic, ember, lavender)
    --gradient C1,C2,...   Custom mesh gradient: 3-5 hex colors placed at automatic
                           positions. Overrides --preset.
    --padding N            Padding around window in pixels (default: 80)
    --corner-radius N      Window corner radius (default: 12)
    --shadow-radius N      Drop shadow blur radius (default: 30)
    --shadow-opacity N     Shadow opacity 0-255 (default: 80)
    --title-bar-height N   macOS title bar height (default: 36)
"""

import argparse
import math
from PIL import Image, ImageDraw, ImageFilter


# Mesh gradient presets — each is a list of (relative_x, relative_y, hex_color)
# Coordinates are 0.0-1.0 relative to the canvas size.
PRESETS = {
    "sunset": [
        (0.0, 1.0, "#FF6B6B"),
        (0.5, 0.5, "#C77DBA"),
        (1.0, 0.0, "#6B8DE3"),
        (0.0, 0.0, "#E8A0BF"),
    ],
    "ocean": [
        (0.0, 0.0, "#0F2027"),
        (0.5, 0.3, "#203A43"),
        (1.0, 0.7, "#2C5364"),
        (0.3, 1.0, "#1A3A4A"),
    ],
    "aurora": [
        (0.0, 0.0, "#0B3D2E"),
        (0.3, 0.4, "#1B8A6B"),
        (0.7, 0.2, "#6DD5C2"),
        (1.0, 1.0, "#0B3D4E"),
        (0.0, 1.0, "#134E5E"),
    ],
    "candy": [
        (0.0, 0.0, "#FF9A9E"),
        (1.0, 0.0, "#FECFEF"),
        (1.0, 1.0, "#F6A085"),
        (0.0, 1.0, "#FBC2EB"),
    ],
    "midnight": [
        (0.0, 0.0, "#1A1A3E"),
        (1.0, 0.0, "#2D1B69"),
        (0.5, 0.5, "#3B2E7E"),
        (1.0, 1.0, "#15112B"),
        (0.0, 1.0, "#0D0D2B"),
    ],
    "fog": [
        (0.0, 0.0, "#C9CCD3"),
        (0.5, 0.3, "#BEC3CC"),
        (1.0, 0.6, "#D5D8DC"),
        (0.3, 1.0, "#A8B0BA"),
        (1.0, 1.0, "#C2C7CF"),
    ],
    "peach": [
        (0.0, 0.0, "#FFDEE9"),
        (1.0, 0.0, "#FFC3A0"),
        (0.5, 1.0, "#FF9A76"),
        (0.0, 1.0, "#FFCDA8"),
    ],
    "arctic": [
        (0.0, 0.0, "#E0EAFC"),
        (0.5, 0.4, "#89CFF0"),
        (1.0, 0.0, "#CFDEF3"),
        (0.3, 1.0, "#4DA8DA"),
        (1.0, 1.0, "#B6D0E2"),
    ],
    "ember": [
        (0.0, 0.0, "#FF4E50"),
        (0.5, 0.3, "#FC913A"),
        (1.0, 0.0, "#F9D423"),
        (1.0, 1.0, "#FF4E50"),
        (0.0, 1.0, "#E84393"),
    ],
    "lavender": [
        (0.0, 0.0, "#E8D5F5"),
        (1.0, 0.0, "#C9B1FF"),
        (0.5, 0.5, "#A78BFA"),
        (0.0, 1.0, "#DDD6FE"),
        (1.0, 1.0, "#8B5CF6"),
    ],
}

# Default positions for custom color lists (3-5 colors)
AUTO_POSITIONS = {
    3: [(0.0, 0.0), (1.0, 0.0), (0.5, 1.0)],
    4: [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)],
    5: [(0.0, 0.0), (1.0, 0.0), (0.5, 0.5), (0.0, 1.0), (1.0, 1.0)],
}


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def create_mesh_gradient(width: int, height: int, color_points: list[tuple[float, float, str]]) -> Image.Image:
    """Create a mesh gradient by blending multiple color points with inverse-distance weighting.

    Each color_point is (rel_x, rel_y, hex_color) where coordinates are 0.0-1.0.
    Renders at 1/4 resolution then upscales with bicubic for smooth result + speed.
    """
    scale = 4
    sw, sh = max(width // scale, 1), max(height // scale, 1)

    points = []
    for rx, ry, hex_color in color_points:
        px = rx * (sw - 1)
        py = ry * (sh - 1)
        rgb = hex_to_rgb(hex_color)
        points.append((px, py, rgb))

    img = Image.new("RGB", (sw, sh))
    pixels = img.load()

    # Power parameter controls falloff — higher = sharper blobs
    power = 3.0

    for y in range(sh):
        for x in range(sw):
            r_sum, g_sum, b_sum, w_sum = 0.0, 0.0, 0.0, 0.0
            for px, py, (pr, pg, pb) in points:
                dist = math.sqrt((x - px) ** 2 + (y - py) ** 2)
                if dist < 0.001:
                    r_sum, g_sum, b_sum, w_sum = float(pr), float(pg), float(pb), 1.0
                    break
                w = 1.0 / (dist ** power)
                r_sum += pr * w
                g_sum += pg * w
                b_sum += pb * w
                w_sum += w
            pixels[x, y] = (
                min(255, max(0, int(r_sum / w_sum))),
                min(255, max(0, int(g_sum / w_sum))),
                min(255, max(0, int(b_sum / w_sum))),
            )

    # Upscale with bicubic interpolation for smooth blending
    img = img.resize((width, height), Image.BICUBIC)
    # Extra blur pass to eliminate any banding
    img = img.filter(ImageFilter.GaussianBlur(radius=2))
    return img


def round_corners(img: Image.Image, radius: int) -> Image.Image:
    """Apply rounded corner mask to an RGBA image."""
    mask = Image.new("L", img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (img.width - 1, img.height - 1)], radius=radius, fill=255)
    img.putalpha(mask)
    return img


def create_shadow(size: tuple, radius: int, opacity: int) -> Image.Image:
    """Create a gaussian blur drop shadow."""
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    margin = radius * 2
    draw.rectangle(
        [margin, margin, size[0] - margin, size[1] - margin],
        fill=(0, 0, 0, opacity),
    )
    return shadow.filter(ImageFilter.GaussianBlur(radius=radius))


def draw_traffic_lights(draw: ImageDraw.Draw, x: int, y: int, bar_height: int):
    """Draw macOS red/yellow/green traffic light buttons."""
    colors = ["#FF5F57", "#FEBC2E", "#28C840"]
    dot_radius = 6
    spacing = 20
    cy = y + bar_height // 2
    for i, color in enumerate(colors):
        cx = x + 16 + i * spacing
        draw.ellipse(
            [cx - dot_radius, cy - dot_radius, cx + dot_radius, cy + dot_radius],
            fill=color,
        )


def resolve_gradient(preset: str | None, gradient_str: str | None) -> list[tuple[float, float, str]]:
    """Resolve gradient arguments into a list of (rel_x, rel_y, hex_color) points."""
    if gradient_str:
        colors = [c.strip() for c in gradient_str.split(",")]
        n = len(colors)
        if n < 2:
            raise ValueError("--gradient requires at least 2 colors")
        if n == 2:
            # Simple two-color: place at four corners for a diagonal wash
            return [(0.0, 0.0, colors[0]), (1.0, 0.0, colors[0]),
                    (1.0, 1.0, colors[1]), (0.0, 1.0, colors[1])]
        positions = AUTO_POSITIONS.get(n)
        if positions is None:
            raise ValueError("--gradient supports 2-5 colors")
        return [(px, py, c) for (px, py), c in zip(positions, colors)]

    name = preset or "sunset"
    if name not in PRESETS:
        available = ", ".join(sorted(PRESETS.keys()))
        raise ValueError(f"Unknown preset '{name}'. Available: {available}")
    return PRESETS[name]


def generate_product_shot(
    input_path: str,
    output_path: str,
    color_points: list[tuple[float, float, str]],
    padding: int = 80,
    corner_radius: int = 12,
    shadow_radius: int = 30,
    shadow_opacity: int = 80,
    title_bar_height: int = 36,
):
    screenshot = Image.open(input_path).convert("RGBA")
    sw, sh = screenshot.size

    win_w = sw
    win_h = sh + title_bar_height

    canvas_w = win_w + padding * 2
    canvas_h = win_h + padding * 2

    # 1. Mesh gradient background
    canvas = create_mesh_gradient(canvas_w, canvas_h, color_points).convert("RGBA")

    # 2. Drop shadow
    shadow = create_shadow((canvas_w, canvas_h), shadow_radius, shadow_opacity)
    shadow_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    shadow_layer.paste(shadow, (0, 4))
    canvas = Image.alpha_composite(canvas, shadow_layer)

    # 3. Window frame
    window = Image.new("RGBA", (win_w, win_h), (255, 255, 255, 255))

    title_bar = Image.new("RGBA", (win_w, title_bar_height), (0, 0, 0, 0))
    title_draw = ImageDraw.Draw(title_bar)
    for y in range(title_bar_height):
        t = y / max(title_bar_height - 1, 1)
        gray = int(232 + (220 - 232) * t)
        title_draw.line([(0, y), (win_w, y)], fill=(gray, gray, gray, 255))

    draw_traffic_lights(title_draw, 0, 0, title_bar_height)
    window.paste(title_bar, (0, 0))
    window.paste(screenshot, (0, title_bar_height), screenshot)
    window = round_corners(window, corner_radius)

    # 4. Composite
    canvas.paste(window, (padding, padding), window)

    # 5. Save
    canvas.save(output_path, "PNG")
    print(f"Product shot saved to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Generate a product shot mockup")
    parser.add_argument("input", help="Path to the input screenshot")
    parser.add_argument("output", help="Path for the output PNG")
    parser.add_argument("--preset", default=None,
                        help="Gradient preset: sunset, ocean, aurora, candy, midnight, fog, peach, arctic, ember, lavender")
    parser.add_argument("--gradient", default=None,
                        help="Custom mesh gradient: 2-5 comma-separated hex colors (overrides --preset)")
    parser.add_argument("--padding", type=int, default=80, help="Padding around window (px)")
    parser.add_argument("--corner-radius", type=int, default=12, help="Window corner radius (px)")
    parser.add_argument("--shadow-radius", type=int, default=30, help="Shadow blur radius (px)")
    parser.add_argument("--shadow-opacity", type=int, default=80, help="Shadow opacity (0-255)")
    parser.add_argument("--title-bar-height", type=int, default=36, help="Title bar height (px)")
    args = parser.parse_args()

    color_points = resolve_gradient(args.preset, args.gradient)
    generate_product_shot(
        input_path=args.input,
        output_path=args.output,
        color_points=color_points,
        padding=args.padding,
        corner_radius=args.corner_radius,
        shadow_radius=args.shadow_radius,
        shadow_opacity=args.shadow_opacity,
        title_bar_height=args.title_bar_height,
    )


if __name__ == "__main__":
    main()
