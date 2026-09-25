---
name: art-direction
description: Render-to-texture pipeline, dithering, palette reduction, CRT/scanline effects, and color management for stylized 3D games.
metadata:
  tags: art-direction, post-processing, dithering, palette, retro, rtt, stylization
---

# Art Direction

Art direction is a **render-pipeline problem**, not a texture problem. The
visual identity of a stylized game lives in its post-processing pass, lighting
model, and color management. Design the art pipeline before modeling geometry.

## When to Use This

If the user asks for any named aesthetic — PC-98, PS1, synthwave, vaporwave,
cel-shaded, retro, pixel art, lo-fi — you need a custom post-processing
pipeline. Default MeshStandardMaterial + bloom + vignette will NOT achieve
these looks.

## Render-to-Texture Pipeline

The core pattern: render the 3D scene to a low-resolution offscreen target,
then draw a full-screen quad that samples it with a stylization shader. This
is where dithering, palette reduction, scanlines, and CRT effects live.

```tsx
import { useMemo, useEffect, useState } from "react";
import { useFrame, useThree, createPortal } from "@react-three/fiber";
import * as THREE from "three";

function PostProcessing({ children }: { children: React.ReactNode }) {
  const { gl, size, camera } = useThree();
  const [scene] = useState(() => new THREE.Scene());

  const { rt, postScene, postCamera, material } = useMemo(() => {
    const scale = 0.5; // half-res for retro look
    const w = Math.floor(size.width * scale);
    const h = Math.floor(size.height * scale);
    const rt = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    const material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: rt.texture },
        uResolution: { value: new THREE.Vector2(w, h) },
        uLevels: { value: 5.0 },
      },
      depthTest: false,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: DITHER_FRAG, // see below
    });
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postScene = new THREE.Scene();
    postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    return { rt, postScene, postCamera, material };
  }, []);

  useEffect(() => {
    const scale = 0.5;
    const w = Math.floor(size.width * scale);
    const h = Math.floor(size.height * scale);
    rt.setSize(w, h);
    material.uniforms.uResolution.value.set(w, h);
  }, [size, rt, material]);

  // Programmatic GPU objects aren't auto-disposed — release them on unmount.
  useEffect(() => () => {
    rt.dispose();
    material.dispose();
    postScene.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  }, [rt, material, postScene]);

  // Priority 1 makes R3F disable its automatic render — this callback owns
  // the frame, so the post pass is never overwritten.
  useFrame(() => {
    gl.setRenderTarget(rt);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(postScene, postCamera);
  }, 1);

  return <>{createPortal(children, scene)}</>;
}
```

## Ordered Dithering (Bayer)

The GPU-correct dithering method — per-pixel, parallelizable. Floyd–Steinberg
is serial and unsuitable for a fragment shader.

```glsl
const DITHER_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uLevels;

  float bayer4x4(vec2 fp) {
    vec2 p = floor(mod(fp, 4.0));
    float i = p.x + p.y * 4.0;
    float m = 0.0;
    if (i < 0.5) m = 0.0; else if (i < 1.5) m = 8.0;
    else if (i < 2.5) m = 2.0; else if (i < 3.5) m = 10.0;
    else if (i < 4.5) m = 12.0; else if (i < 5.5) m = 4.0;
    else if (i < 6.5) m = 14.0; else if (i < 7.5) m = 6.0;
    else if (i < 8.5) m = 3.0; else if (i < 9.5) m = 11.0;
    else if (i < 10.5) m = 1.0; else if (i < 11.5) m = 9.0;
    else if (i < 12.5) m = 15.0; else if (i < 13.5) m = 7.0;
    else if (i < 14.5) m = 13.0; else m = 5.0;
    return (m + 0.5) / 16.0;
  }

  void main() {
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    c += (bayer4x4(vUv * uResolution) - 0.5) / uLevels;
    gl_FragColor = vec4(
      floor(c * (uLevels - 1.0) + 0.5) / (uLevels - 1.0),
      1.0
    );
  }
`;
```

`uLevels` controls the palette depth: 4–6 for retro (PC-98, Game Boy), 8–12
for subtle, 16+ for near-continuous.

## Palette Reduction

Quantize to a fixed color palette. Combine with dithering for the classic
retro look:

```glsl
// After dithering, snap to nearest palette color
vec3 palette[4];
palette[0] = vec3(0.07, 0.07, 0.16); // dark
palette[1] = vec3(0.33, 0.16, 0.25); // mid-dark
palette[2] = vec3(0.73, 0.53, 0.40); // mid-light
palette[3] = vec3(0.93, 0.87, 0.73); // light

float bestDist = 1e18;
vec3 bestColor = palette[0];
for (int i = 0; i < 4; i++) {
  float d = distance(c, palette[i]);
  if (d < bestDist) { bestDist = d; bestColor = palette[i]; }
}
gl_FragColor = vec4(bestColor, 1.0);
```

## Scanlines / CRT

```glsl
// Add after color computation
float scanline = sin(vUv.y * uResolution.y * 3.14159) * 0.5 + 0.5;
c *= 0.85 + 0.15 * scanline;

// Optional: slight barrel distortion
vec2 uv = vUv * 2.0 - 1.0;
uv *= 1.0 + 0.02 * dot(uv, uv);
uv = uv * 0.5 + 0.5;
```

## Color Management for Stylized Games

For predictable stylized color (retro, flat, non-PBR), disable Three.js color
management and tone mapping:

```tsx
<Canvas
  flat  // sets NoToneMapping
  gl={{ outputColorSpace: THREE.LinearSRGBColorSpace }}
>
```

`flat` already sets `NoToneMapping`, so don't also pass `toneMapping` in `gl`.
Forcing `LinearSRGBColorSpace` is a deliberate stylization choice: it skips the
sRGB gamma encoding the display expects, so colors render darker/flatter than
the r152+ default — exactly what you want for retro/flat/non-PBR looks, but
wrong for a realistic scene (leave the default sRGB output there; see
`procedural-textures.md` and `troubleshooting.md`).

## Named Aesthetic Recipes

| Style | Lighting | Material | Post-Processing |
| --- | --- | --- | --- |
| **PC-98 / retro pixel** | Hemisphere + 1 directional | `flatShading`, muted palette | Half-res RTT + Bayer dither (4–6 levels) + scanlines |
| **PS1 low-poly** | 1–2 point lights, no shadows | `flatShading`, vertex colors | Half-res RTT + no filtering + affine UV warp |
| **Synthwave / neon** | Ambient low + emissive meshes | Emissive materials, bright colors | Bloom (high intensity) + chromatic aberration |
| **Cel-shaded / toon** | Hemisphere + strong directional | `MeshToonMaterial` | Outlines via drei `<Outlines>` |
| **Flat minimal** | Ambient only or hemisphere | `MeshBasicMaterial`, limited palette | None or subtle vignette |
| **Vaporwave** | Ambient + colored point lights | Metallic, iridescent colors | Bloom + noise + chromatic aberration |

## Fog for ShaderMaterial

Fog is NOT auto-applied to `ShaderMaterial` — blend it manually in the
fragment shader. Recipe in `shaders-and-post.md` → "Fog for ShaderMaterial".
