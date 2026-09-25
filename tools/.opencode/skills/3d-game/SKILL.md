---
name: 3d-game
description:
  "Build 3D games and interactive 3D experiences using Three.js and React
  Three Fiber as full React + TypeScript projects. Covers scene setup,
  procedural geometry and textures, game loops, input, camera rigs, collision,
  audio synthesis, HUD overlays, shaders, and performance. Triggers on '3D
  game', 'Three.js', 'threejs', '3D scene', '3D viewer', 'platformer',
  'racing game', '3D product viewer', 'react three fiber', 'r3f', 'WebGL
  game', '3D animation', '3D world', 'first person', 'third person',
  'low poly', 'voxel', '3D model', 'glb', 'character animation'."
---

# 3D Games & Experiences in Lovable

Build 3D games, viewers, and interactive experiences as full TypeScript
projects using React Three Fiber (R3F).

This file gets a scene on screen and tells you which rule to open for each
part. **It is not the whole skill** — the depth that separates a good 3D game
from a broken or generic one lives in the rule files, and they do not load
themselves. Load the matching rule **before** you build that part.

## Rule Index — load the matching rule before you build that part

Rules live at `knowledge://skill/3d-game/rules/{file}.md`. Open one with
`code--view` **before** building the part it covers — not only when you get
stuck. These cover the things you don't know you're getting wrong: a flat
primitive *looks* done, a neon default *compiles*, a blank canvas *builds*.
Most games need four or five of these.

- Building a **named real-world object** (car, character, animal, tree, rock, crate, weapon, building)? Load `knowledge://skill/3d-game/rules/model-sourcing.md` **before modeling it** — source a CC0 GLB; a box-and-cylinder stand-in is the wrong default, not a shortcut. Then load `knowledge://skill/3d-game/rules/models-and-animation.md` to load/animate it.
- Unsure how far to escalate (procedural vs CC0 vs physics engine)? Load `knowledge://skill/3d-game/rules/decision-framework.md` **before committing to an approach**.
- Picking a **named or retro/stylized look** (PS1, cel-shaded, painterly, voxel, synthwave)? Load `knowledge://skill/3d-game/rules/art-direction.md` **before choosing the render pipeline**.
- Setting up the Canvas, cameras, lights, fog, or shadows? Load `knowledge://skill/3d-game/rules/scene-fundamentals.md`.
- Picking packages, wiring the route, or hitting a stack/TypeScript error? Load `knowledge://skill/3d-game/rules/project-setup.md`.
- Adding a **camera that follows the player** (chase, first-person, orbit)? Load `knowledge://skill/3d-game/rules/camera-rigs.md` + `knowledge://skill/3d-game/rules/input-handling.md` **before wiring movement**, or controls invert.
- Moving things over time, running a state machine, spawning enemies or particles? Load `knowledge://skill/3d-game/rules/game-loop.md`.
- Need movement physics — driving, platforming, jumping, collision? Load `knowledge://skill/3d-game/rules/physics-collision.md`.
- Making it **multiplayer** (online co-op, versus, shared rooms)? Load `knowledge://skill/3d-game/rules/multiplayer.md` **before writing any networking** — the sync model and message budget decide whether it works at all, and per-frame sending breaks the game.
- Building geometry from primitives or custom BufferGeometry? Load `knowledge://skill/3d-game/rules/procedural-geometry.md`.
- Texturing a surface (canvas texture, image texture, color space)? Load `knowledge://skill/3d-game/rules/procedural-textures.md`.
- Writing a custom shader or post-processing pass? Load `knowledge://skill/3d-game/rules/shaders-and-post.md`.
- Adding sound — SFX, engine, music? Load `knowledge://skill/3d-game/rules/audio.md`.
- Building a HUD, menus, score, or scene↔DOM state? Load `knowledge://skill/3d-game/rules/hud-overlay.md`.
- Placing/parenting/combining objects, or something faces/sits in the wrong place? Load `knowledge://skill/3d-game/rules/spatial-reasoning.md`.
- Screen renders **blank, black, or one flat color**? Load `knowledge://skill/3d-game/rules/troubleshooting.md` the moment your first screenshot isn't the scene — work the Black Screen Checklist in order before guessing.

## Before Building — Clarify the Vision

For a one-line brief ("make a racing game"), ask 1–2 clarifying questions
before writing files; for a detailed brief, proceed. When you cannot ask —
an autonomous or roadmap turn with no user to answer — do not stall and do
not fall back to the safest generic choice: make the calls deliberately and
state them in your reply.

The defining constraint is usually **art direction** (the look drives the
whole render pipeline) and the **core mechanic** (drift, platforming, flying,
and puzzles need different physics). If the user names no visual style, pick
one deliberately to fit the game's mood — **do not default to glowing neon /
synthwave / Tron sci-fi**, the single most overused 3D-web look. For the full
style range and the pipeline each implies, load
`knowledge://skill/3d-game/rules/art-direction.md`.

## Stack & Install

**Check `package.json` before installing** — the React version decides the
fiber/drei major.

Default stack (`@tanstack/react-start` + React 19, server-rendered):

```bash
bun add three @react-three/fiber@^9 @react-three/drei@^10 && bun add -D @types/three
```

- The app server-renders: no `window`/`document` access at module or render
  scope — browser APIs only inside `useEffect`/`useFrame`.
- Mount the game on a client-only route so `<Canvas>` never renders on the
  server: `ssr: false` in the route options (see Quick Start).
- A console warning like "A tree hydrated but some attributes of the server
  rendered HTML didn't match" (often naming `<StartClient>`) is a hydration
  mismatch **caused by this app** — never dismiss it as a separate issue.
  Fix per `knowledge://skill/3d-game/rules/project-setup.md` § Hydration.

Older projects (Vite SPA + React 18, "Classic"):

```bash
bun add three @react-three/fiber@^8.18 @react-three/drei@^9.122 && bun add -D @types/three
# fiber v9 / drei v10 require React 19 — stay on fiber 8 / drei 9 with React 18
```

## Quick Start

Minimal working scene — four files. This is scaffolding, not a finish:
restyle it to the game's art direction before presenting.

**src/components/GameCanvas.tsx**

```tsx
import { Canvas } from "@react-three/fiber";
import { Scene } from "./Scene";
import { HUD } from "./HUD";

export function GameCanvas() {
  return (
    <div className="fixed inset-0">
      <Canvas shadows camera={{ position: [0, 8, 12], fov: 60 }}>
        <color attach="background" args={["#87CEEB"]} />
        <fog attach="fog" args={["#87CEEB", 30, 90]} />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <Scene />
      </Canvas>
      <HUD />
    </div>
  );
}
```

**src/components/Scene.tsx**

```tsx
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export function Scene() {
  const boxRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (boxRef.current) boxRef.current.rotation.y += delta;
  });

  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#4a7c59" />
      </mesh>
      <mesh ref={boxRef} position={[0, 1, 0]} castShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#e74c3c" />
      </mesh>
    </>
  );
}
```

**src/components/HUD.tsx**

```tsx
export function HUD() {
  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      <div className="p-4 text-white font-mono text-lg drop-shadow-lg">
        Score: 0
      </div>
    </div>
  );
}
```

**Mount it** — on the default stack (TanStack Start), create a client-only
route:

```tsx
// src/routes/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { GameCanvas } from "../components/GameCanvas";

export const Route = createFileRoute("/")({
  ssr: false, // Canvas must never render on the server
  component: GameCanvas,
});
```

On Classic (Vite SPA), render `<GameCanvas />` from `src/App.tsx` instead.
When adding 3D to an **existing app**, mount on a new route rather than
replacing `/`.

## Core Philosophy

1. **Art direction is a render-pipeline problem.** The visual identity of a
   stylized game lives in its post-processing pass, lighting model, and color
   management — design it before modeling (`art-direction.md`).
2. **Source CC0 models for named real-world objects — don't approximate them
   with primitives.** A car, character, animal, tree, building, or weapon looks
   far better as a CC0 GLB (Kenney / Quaternius / poly.pizza — game-ready,
   low-poly, and rigged + animated for characters) than a box-and-cylinder
   stand-in, which reads as a placeholder; "low-poly" is no excuse, since the
   CC0 kits *are* low-poly. Source it via `model-sourcing.md` (or
   `scripts/fetch_model.py`). Order matters: download and validate the file
   (it exists, `head -c 4` prints `glTF`) **before** writing any code that
   references it — a `useGLTF("/models/x.glb")` pointing at a file that never
   landed is a permanent Suspense hang. If a fetch fails, decide deliberately:
   try the next source, or state the procedural fallback to the user — never
   leave code referencing a phantom path. Stay procedural only for abstract /
   stylized / voxel / generated forms.
3. **Raise the visual floor on every scene.** Textured surfaces (procedural
   canvas or CC0 image), an `<Environment>` for ambient light + reflections,
   and material variation — a large single-color `meshStandardMaterial` plane is
   a placeholder, not a finish. Never `<Environment preset="...">`: presets
   fetch an HDR from a third-party CDN at runtime, and when that fetch fails
   the scene hangs blank behind Suspense. The local form is just as short and
   cannot fail:

   ```tsx
   <Environment>
     <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} />
     <Lightformer intensity={1} color="#8bb" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
   </Environment>
   ```

   And keep a visibility floor: a dark or moody look comes from color grading
   and contrast, not from removing light — if the player can't see the scene,
   the mood has failed.
4. **Feel-first physics.** Make "feel" named constants (ACCEL, DRAG, GRIP,
   TURN); tune the constants, not the model. Use frame-rate-independent
   damping: `v *= Math.exp(-k * delta)`, never `v *= 0.9`.
5. **Delta-time everything.** All motion uses `delta` from `useFrame`. Clamp it
   to avoid tunneling after tab switches: `const dt = Math.min(rawDelta, 0.05)`.
6. **React Three Fiber over vanilla Three.js.** R3F handles renderer setup,
   resize, cleanup, and React integration. This binds *your* choice — when the
   user explicitly asks for another engine (Bevy, Babylon.js, vanilla
   Three.js, WebGPU), say the R3F guidance here doesn't apply and follow
   their engine; do not drift off R3F on your own initiative.
7. **DOM HUD over in-canvas UI.** Scores, menus, and health bars are regular
   React components layered over the canvas (`hud-overlay.md`).

## Performance Budget

Your players' devices include phones and integrated GPUs — build to a
mobile-web budget:

| Metric | Budget |
| --- | --- |
| Draw calls | < 100 |
| Triangles | < 100K |
| Shadow map size | 1024–2048 |
| Pixel ratio | Cap at 1–2 |
| Post-processing passes | 1–2 |

## Verify in the Browser — Never Skip

A black screen compiles fine. Treat the first render as broken until a
screenshot proves otherwise. There is no built-in screenshot tool — a ready
harness ships with this skill; copy and run it instead of hand-rolling
Playwright:

```bash
code--exec cp /tmp/knowledge/skill/3d-game/scripts/verify.py /tmp/verify.py
code--exec python /tmp/verify.py --url http://localhost:8080 --shot /tmp/shot.png --keys "Space ArrowLeft"
code--view /tmp/shot.png
```

The harness browser runs inside the sandbox without a GPU (software-rendered
WebGL), so heavy scenes draw slowly *there*: raise `--wait` before concluding
a dark frame is broken, and judge correctness — never performance — from
these screenshots.

Inspect the screenshot (a solid-color image *is* a black screen), and read the
console + network output it prints (a 404 on a GLB leaves the Suspense fallback
up forever with no error). If the app opens on a start/title gate, pass the
keys/click to enter before the shot, or the scene goes unchecked. On any
failure, load `knowledge://skill/3d-game/rules/troubleshooting.md` and work the
Black Screen Checklist. Verify motion by comparing two shots a moment apart or
a changing HUD value. Present only when the screenshot shows the intended scene
and console/runtime errors are clean.

## Before Finishing

- [ ] Art direction is a deliberate fit, not the default neon/sci-fi look
- [ ] Named real-world objects use a CC0 GLB, not a primitive stand-in (`model-sourcing.md`)
- [ ] No large flat untextured surfaces; scene has an `<Environment>`/IBL (Lightformer or bundled file — no CDN `preset`) + material variation
- [ ] Scene is clearly visible — dark/moody looks read via grading and contrast, not missing light; no unresolved hydration warnings in the console
- [ ] Movement is camera-relative for any non-top-down camera (W goes where the camera looks)
- [ ] All motion uses `delta`; all damping uses `Math.exp(-k * delta)`
- [ ] Components calling `useGLTF`/`useTexture` are wrapped in `<Suspense>` *inside* the Canvas
- [ ] Ran the Verify-in-the-Browser loop — screenshot shows the lit scene, console/runtime clean

## Scope & Persistence

- Local high scores: `localStorage` (recipe in `hud-overlay.md`).
- Shared leaderboards, accounts, cross-device saves: need Lovable Cloud — beyond
  this skill; tell the user instead of faking it with local data.
- Casual online multiplayer (2–8 players): supported — load
  `knowledge://skill/3d-game/rules/multiplayer.md` before writing any
  networking (requires Lovable Cloud). Server-authoritative or competitive
  multiplayer and MMO scale remain out of scope — state the limitation.
