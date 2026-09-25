---
name: project-setup
description: Package versions per stack, file structure, and build configuration for Three.js game projects.
metadata:
  tags: setup, packages, structure, tanstack, vite
---

# Project Setup

## Packages

Default stack (TanStack Start + React 19):

```bash
bun add three @react-three/fiber@^9 @react-three/drei@^10 && bun add -D @types/three
```

Classic (Vite SPA + React 18) — fiber v9+ requires React 19, so pin:

```bash
bun add three @react-three/fiber@^8.18 @react-three/drei@^9.122 && bun add -D @types/three
```

Optional — add only when needed:

| Package | When |
| --- | --- |
| `zustand` | Game state shared between 3D scene and HUD |
| `@react-three/rapier` | Rigid body physics (gravity, joints, ragdoll) |
| `@react-three/postprocessing` | Bloom, vignette, chromatic aberration |
| `leva` | Debug controls panel (dev only) |

## File Structure

```
src/
  routes/
    index.tsx                  # Mount GameCanvas with ssr: false (TanStack Start)
  components/
    GameCanvas.tsx             # <Canvas> + lights + camera + <Scene>
    Scene.tsx                  # Scene graph: ground, objects, player
    Player.tsx                 # Player mesh + movement (useFrame)
    HUD.tsx                    # DOM overlay (score, menus)
  hooks/
    useKeyboard.ts             # Keyboard input tracking
    useGameStore.ts            # Zustand store (score, state, lives)
  lib/
    geometry.ts                # Procedural mesh builder helpers
    materials.ts               # Shared materials and texture generators
    audio.ts                   # Web Audio manager, synth SFX
  types/
    game.ts                    # Shared TypeScript interfaces
public/
  textures/                    # Optional: baked textures if user uploads
  models/                      # Optional: glTF/GLB if user provides
```

On Classic (Vite SPA) there is no `src/routes/` — mount `<GameCanvas />`
from `src/App.tsx` instead.

Simpler projects (viewers, demos) can start with just `GameCanvas.tsx` +
`Scene.tsx` — split into more files as complexity grows.

## Build Configuration

No special config needed for Three.js — the default Lovable setup works on
both stacks (both build with Vite under the hood).

**GLSL shaders**: Write as template literal strings inside TypeScript files.
No build plugin required:

```ts
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
```

The `/* glsl */` comment enables syntax highlighting in editors that support
it but has no runtime effect.

## Hydration (TanStack Start SSR)

The default stack server-renders everything outside `ssr: false` routes. A
console warning like `A tree hydrated but some attributes of the server
rendered HTML didn't match` (the stack often names `<StartClient>`) means a
component rendered differently on server and client. It is caused by this
app's code, corrupts interactive state, and must be fixed — never dismissed
as a separate or upstream issue.

The usual causes, in order of likelihood:

1. A 3D/browser component rendered on a server route — move it behind
   `ssr: false` route options, or gate it client-only:
   `const [mounted, setMounted] = useState(false); useEffect(() =>
   setMounted(true), []); if (!mounted) return null;`
2. Render output that differs per run: `Math.random()`, `Date.now()`,
   locale/time formatting, or `window`-dependent values used during render.
   Compute them in `useEffect`/`useFrame`, or seed them deterministically.
3. Invalid HTML nesting (e.g. `<div>` inside `<p>`) — the browser reparents
   it and hydration can't match.

Verify the fix by reloading with a clean console — zero hydration warnings,
not fewer.

## TypeScript

`@types/three` provides types for Three.js. R3F and drei are fully typed.

When using `useRef` for Three.js objects, type them explicitly:

```tsx
const meshRef = useRef<THREE.Mesh>(null);
const groupRef = useRef<THREE.Group>(null);
const materialRef = useRef<THREE.MeshStandardMaterial>(null);
```

### `Property 'mesh' does not exist on type 'JSX.IntrinsicElements'`

On the default stack (fiber v9 + React 19), the intrinsic elements `<mesh>`,
`<group>`, `<meshStandardMaterial>`, `<color>`, `<fog>` … are typed by
`@react-three/fiber`, which augments `React.JSX`. A `.tsx` file that uses those
intrinsics but imports nothing from fiber doesn't pull the augmentation, so
`tsgo` reports `Property 'mesh'/'color' does not exist on type
'JSX.IntrinsicElements'`. Don't cast or `// @ts-expect-error` each tag — load
the augmentation globally once:

```ts
// src/types/r3f.d.ts
import "@react-three/fiber";
```

After editing a `.d.ts`, the platform's cached typecheck can report the same
errors for a beat — trust a clean fresh `tsgo` run instead of looping on
phantom errors.

## Assets

**Named real-world objects get a CC0 GLB** (`model-sourcing.md`); stay
procedural for abstract, stylized, voxel, or generated forms — see Core
Philosophy #2 in `SKILL.md` and the escalation table in
`decision-framework.md`.

**User-provided assets**: If the user uploads `.glb`, `.gltf`, or image files,
place them in `public/` and load with:

```tsx
import { useGLTF } from "@react-three/drei";

function Model() {
  const { scene } = useGLTF("/models/character.glb");
  return <primitive object={scene} />;
}
```

For animation clips, cloning, and scale normalization see
`models-and-animation.md`; for finding free CC0 models online see
`model-sourcing.md`.
