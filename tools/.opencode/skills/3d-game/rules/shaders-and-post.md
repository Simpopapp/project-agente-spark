---
name: shaders-and-post
description: Custom ShaderMaterial, GLSL patterns, uniforms, and R3F post-processing effects.
metadata:
  tags: shaders, glsl, post-processing, bloom, shader-material
---

# Shaders & Post-Processing

For full art-direction pipelines (RTT, dithering, palette reduction, CRT),
see `knowledge://skill/3d-game/rules/art-direction.md`. This file covers
individual ShaderMaterial patterns and the R3F postprocessing wrapper.

## Custom ShaderMaterial

Write GLSL as template literal strings. No build plugin needed:

```tsx
import { useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function GradientSky() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uTopColor: { value: new THREE.Color("#1a0a2e") },
    uBottomColor: { value: new THREE.Color("#ff7040") },
  }), []);

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta;
  });

  return (
    <mesh>
      <sphereGeometry args={[500, 16, 16]} />
      <shaderMaterial
        ref={matRef}
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec3 vWorldPos;
          void main() {
            vWorldPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 uTopColor;
          uniform vec3 uBottomColor;
          uniform float uTime;
          varying vec3 vWorldPos;
          void main() {
            float t = normalize(vWorldPos).y * 0.5 + 0.5;
            vec3 col = mix(uBottomColor, uTopColor, t);
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}
```

Skydomes: use `depthTest: false` + `depthWrite: false` and recenter on the
camera each frame (or make huge enough that clipping doesn't matter).

## Common Shader Recipes

### Animated Water

```tsx
fragmentShader={/* glsl */ `
  uniform float uTime;
  varying vec3 vWorldPos;
  void main() {
    float wave = sin(vWorldPos.x * 0.1 + uTime) + sin(vWorldPos.z * 0.08 - uTime * 0.7);
    vec3 deep = vec3(0.05, 0.1, 0.3);
    vec3 shallow = vec3(0.1, 0.25, 0.5);
    vec3 col = mix(deep, shallow, 0.5 + 0.3 * wave);
    float refl = exp(-abs(vWorldPos.x) * 0.02);
    float shimmer = step(0.0, sin(vWorldPos.z * 0.4 + uTime * 3.0));
    col += vec3(1.0, 0.6, 0.4) * refl * shimmer * 0.4;
    gl_FragColor = vec4(col, 0.9);
  }
`}
```

### Pulsing Glow

```tsx
fragmentShader={/* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  void main() {
    float pulse = 0.6 + 0.4 * sin(uTime * 3.0);
    gl_FragColor = vec4(uColor * pulse, 1.0);
  }
`}
```

### Grid / Tron Floor

```tsx
fragmentShader={/* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 grid = abs(fract(vUv * 20.0 - 0.5) - 0.5);
    float line = min(grid.x, grid.y);
    float edge = 1.0 - smoothstep(0.0, 0.05, line);
    vec3 col = mix(vec3(0.02), vec3(0.0, 0.8, 1.0), edge * 0.8);
    // Fade with distance from center
    float dist = length(vUv - 0.5);
    col *= 1.0 - smoothstep(0.2, 0.5, dist);
    gl_FragColor = vec4(col, 1.0);
  }
`}
```

### Vertex Displacement (Waves, Terrain)

```tsx
vertexShader={/* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vHeight;
  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.z += sin(pos.x * 0.5 + uTime) * cos(pos.y * 0.3 + uTime * 0.7) * 0.5;
    vHeight = pos.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`}
```

Displace `pos.z`, not `pos.y`: a `PlaneGeometry` lies in its local XY plane
(both in-plane axes are `x`/`y`, `z` is always 0), so `z` is the surface normal
and the only axis that pushes vertices *out*. This is correct whether the plane
faces the camera or is rotated −90° about X to lie flat as ground (Terrain
example in `procedural-geometry.md`) — `z` becomes world-up after that rotation.

## Uniforms

Pass time, resolution, and game state to shaders. Get the resolution from
`useThree` — not `window` (SSR-unsafe, and stale after resize):

```tsx
const { size } = useThree();
const uniforms = useMemo(() => ({
  uTime: { value: 0 },
  uResolution: { value: new THREE.Vector2(1, 1) },
  uPlayerPos: { value: new THREE.Vector3() },
}), []);

useFrame(({ clock }) => {
  uniforms.uTime.value = clock.elapsedTime;
  uniforms.uResolution.value.set(size.width, size.height);
  uniforms.uPlayerPos.value.copy(playerRef.current!.position);
});
```

Wrap uniforms in `useMemo` so the object reference is stable across renders.

## ShaderMaterial vs RawShaderMaterial

- `ShaderMaterial` — Three.js injects built-in uniforms (`projectionMatrix`,
  `modelViewMatrix`, `cameraPosition`) and attributes (`position`, `uv`,
  `normal`). Use this by default.
- `RawShaderMaterial` — nothing injected, you declare everything. Only use
  when you need full control (e.g., conflicting uniform names).

## R3F Post-Processing (Simple Effects)

For 1–2 standard effects (bloom, vignette), use `@react-three/postprocessing`
instead of a custom RTT pipeline:

```bash
bun add @react-three/postprocessing postprocessing
```

```tsx
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";

<Canvas>
  {/* scene contents */}
  <EffectComposer>
    <Bloom luminanceThreshold={0.8} intensity={0.5} />
    <Vignette offset={0.3} darkness={0.6} />
  </EffectComposer>
</Canvas>
```

| Effect | Use for |
| --- | --- |
| `Bloom` | Glowing lights, neon, emissive materials |
| `Vignette` | Darkened edges, cinematic feel |
| `ChromaticAberration` | RGB fringe, retro/glitch aesthetic |
| `DepthOfField` | Focus effect, tilt-shift |
| `Noise` | Film grain |

For stylized/retro looks that require dithering, palette reduction, or
scanlines, use the custom RTT pipeline from `art-direction.md` instead.

### Toon / Outline Shader

```tsx
import { Outlines } from "@react-three/drei";

<mesh>
  <boxGeometry />
  <meshToonMaterial color="#e74c3c" />
  <Outlines thickness={2} color="black" />
</mesh>
```

## Fog + ShaderMaterial

Fog is NOT auto-applied to `ShaderMaterial`. Blend manually:

```glsl
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;

void main() {
  vec3 col = /* your color */;
  float depth = gl_FragCoord.z / gl_FragCoord.w;
  float fogFactor = smoothstep(fogNear, fogFar, depth);
  gl_FragColor = vec4(mix(col, fogColor, fogFactor), 1.0);
}
```

## Sandbox Performance Note

The sandbox browser has no GPU. Post-processing is software-rendered. Use at
most 1–2 effects, or a single RTT pass with a lightweight fragment shader.
The deployed site runs on real hardware and handles more.
