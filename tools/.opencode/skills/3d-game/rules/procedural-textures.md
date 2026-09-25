---
name: procedural-textures
description: Canvas-generated textures, DataTexture, color space management, material recipes, and loading image textures with useTexture.
metadata:
  tags: textures, canvas, procedural, color-space, useTexture, image-textures
---

# Procedural Textures

Generate textures in code instead of loading image files. Eliminates asset
dependencies and enables unique visual styles (pixel art, retro, stylized).

**Texture the dominant surfaces — don't ship flat color.** A large ground,
wall, or sky plane with a bare single-color material reads as a placeholder.
Give every major surface a texture (a canvas pattern below, or a CC0 image map
via `useTexture` — see `model-sourcing.md`), pair it with a drei
`<Environment>` for reflections/IBL (built from `<Lightformer>` children or a
bundled file — never a named `preset`, which fetches an HDR from a third-party
CDN at runtime and blanks the scene when it fails; SKILL.md has the
copy-paste Lightformer form), and vary roughness/metalness. Flat
untextured color is a deliberate minimalist style, not the default floor.

## Canvas Textures

Create a `<canvas>`, draw patterns with the 2D API, and use it as a texture:

```ts
import * as THREE from "three";

function createCheckerTexture(size = 64, color1 = "#fff", color2 = "#ccc") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;
  ctx.fillStyle = color1;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = color2;
  ctx.fillRect(0, 0, half, half);
  ctx.fillRect(half, half, half, half);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}
```

### Road with Lane Markings

```ts
function createRoadTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#333";
  ctx.fillRect(0, 0, 64, 128);
  // Edge lines
  ctx.fillStyle = "#ddd";
  ctx.fillRect(2, 0, 2, 128);
  ctx.fillRect(60, 0, 2, 128);
  // Center dashes
  ctx.fillStyle = "#ffcc00";
  ctx.fillRect(30, 10, 4, 40);
  ctx.fillRect(30, 70, 4, 40);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}
```

### Ground with Grass Speckle

```ts
function createGroundTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#3c6b4f";
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#2a5a3c" : "#60804a";
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 20);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}
```

## DataTexture

For noise or computed patterns where canvas drawing is awkward:

```ts
function createNoiseTexture(size = 64) {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = Math.random() * 255;
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  return tex;
}
```

## Color Space

Critical for correct colors. Since Three.js r152, the renderer defaults to
sRGB output.

| Texture purpose | `colorSpace` setting |
| --- | --- |
| Color, albedo, emissive | `THREE.SRGBColorSpace` |
| Normal, roughness, metalness, AO | Leave as default (linear) |

`CanvasTexture` auto-tags as sRGB — no manual setting needed. For
`DataTexture` used as a color map, set it explicitly:

```ts
texture.colorSpace = THREE.SRGBColorSpace;
```

## Pixel Art / Retro Style

Use `NearestFilter` to disable smoothing:

```ts
texture.magFilter = THREE.NearestFilter;
texture.minFilter = THREE.NearestFilter;
```

Combined with a low-resolution canvas texture, this produces a chunky retro
look.

## Wrapping and Repeat

```ts
texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set(4, 4);
```

Use `ClampToEdgeWrapping` for textures that should not tile (decals, labels).

## Using Canvas Textures in R3F

Generate once with `useMemo`, apply to material:

```tsx
import { useMemo } from "react";

function Ground() {
  const texture = useMemo(() => createGroundTexture(), []);

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}
```

## Image Textures (useTexture)

Reach for image files when canvas drawing falls short — realistic surfaces
(wood, brick, terrain) or user-provided art. Procedural stays the default.
For finding free CC0 texture images, see `model-sourcing.md`.

```tsx
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

function Ground() {
  const texture = useTexture("/textures/grass.jpg", (t) => {
    t.colorSpace = THREE.SRGBColorSpace; // loaded color maps are NOT auto-tagged sRGB (CanvasTexture is)
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(20, 20);
  });

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}
```

Full material set (object form) — only the color map gets sRGB; normal and
roughness stay linear (see the Color Space table above):

```tsx
const maps = useTexture({
  map: "/textures/wood_color.jpg",
  normalMap: "/textures/wood_normal.jpg",
  roughnessMap: "/textures/wood_rough.jpg",
});
maps.map.colorSpace = THREE.SRGBColorSpace;

<meshStandardMaterial {...maps} />
```

`useTexture` suspends like `useGLTF` — the component must sit inside
`<Suspense>` inside the Canvas (see the Black Screen Checklist in
`troubleshooting.md`).
