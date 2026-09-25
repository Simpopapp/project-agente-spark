---
name: scene-fundamentals
description: Canvas setup, cameras, lighting, fog, shadows, and scene composition in React Three Fiber.
metadata:
  tags: canvas, camera, lights, shadows, fog, scene
---

# Scene Fundamentals

## Canvas

The R3F `<Canvas>` creates the WebGL renderer, scene, and default camera.
Wrap it in a div that controls its size:

```tsx
<div className="fixed inset-0">
  <Canvas
    shadows
    camera={{ position: [0, 8, 12], fov: 60 }}
    dpr={[1, 2]}
    gl={{ antialias: true }}
  >
    {/* scene contents */}
  </Canvas>
</div>
```

- `shadows` — enables shadow maps on the renderer
- `dpr={[1, 2]}` — caps device pixel ratio (R3F's default is already [1, 2]; use `dpr={1}` to claw back fill rate on heavy scenes in the software-WebGL sandbox)
- `flat` — add this prop for non-PBR scenes (disables tone mapping)

R3F handles resize automatically — no manual resize handler needed.

## Camera

**Inline camera** (simple scenes):

```tsx
<Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
```

**Programmatic camera** (games):

```tsx
import { PerspectiveCamera } from "@react-three/drei";

<PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60} />
```

Then control it in `useFrame`:

```tsx
useFrame(({ camera }, delta) => {
  // frame-rate-independent lerp — never a bare constant factor (see camera-rigs.md)
  camera.position.lerp(targetPosition, 1 - Math.exp(-4 * delta));
  camera.lookAt(targetLookAt);
});
```

## Lighting

Every scene needs light — `MeshStandardMaterial` renders black without it.

**Outdoor** (most games):

```tsx
<ambientLight intensity={0.5} />
<directionalLight
  position={[10, 15, 10]}
  intensity={1.5}
  castShadow
  shadow-mapSize-width={1024}
  shadow-mapSize-height={1024}
  shadow-camera-left={-20}
  shadow-camera-right={20}
  shadow-camera-top={20}
  shadow-camera-bottom={-20}
/>
```

**Outdoor with sky color** (natural feel):

```tsx
<hemisphereLight args={["#87CEEB", "#4a7c59", 0.6]} />
<directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
```

**Indoor**:

```tsx
<ambientLight intensity={0.3} />
<pointLight position={[0, 4, 0]} intensity={1} castShadow />
```

**Night / horror / moody scenes — keep a visibility floor.** Dark mood comes
from color grading, contrast, and pools of light — not from removing light.
Never drop total illumination below roughly the indoor recipe above
(`ambientLight` ≥ 0.3-equivalent, or a dim hemisphere/IBL plus deliberate
local lights). If a playtest screenshot needs squinting to find the player,
the scene is under-lit, not atmospheric — "it's dark even in daytime" is a
bug report you should never receive.

```tsx
<ambientLight intensity={0.35} color="#223" />   {/* cool, dim, but present */}
<pointLight position={[0, 3, 2]} intensity={2} color="#ffaa55" castShadow />
<fog attach="fog" args={["#0a0a12", 8, 30]} />   {/* darkness lives in the fog */}
```

## Shadows

1. Add `shadows` prop to `<Canvas>`
2. Add `castShadow` to lights and meshes that cast
3. Add `receiveShadow` to meshes that receive (ground, walls)
4. Tighten the shadow camera frustum to your scene bounds — smaller frustum
   means sharper shadows

Keep `shadow-mapSize` at 1024 or 2048. Higher values are expensive and rarely
needed for stylized games.

## Background and Fog

```tsx
{/* Solid color background */}
<color attach="background" args={["#87CEEB"]} />

{/* Fog — hides far geometry, adds depth */}
<fog attach="fog" args={["#87CEEB", 30, 90]} />
```

Match fog color to background color. For exponential fog: `<fogExp2
attach="fog" args={["#87CEEB", 0.02]} />`.

For a sky dome, use drei's `<Sky>` or `<Environment>`:

```tsx
import { Sky } from "@react-three/drei";
<Sky sunPosition={[100, 20, 100]} />
```

## Scene Composition

Group related objects with `<group>`:

```tsx
<group position={[10, 0, 5]} rotation-y={Math.PI / 4}>
  <mesh position={[0, 1, 0]}> {/* relative to group */}
    <boxGeometry />
    <meshStandardMaterial color="brown" />
  </mesh>
</group>
```

Groups can be moved, rotated, and scaled as a unit — use them to build
compound objects (car body + wheels, tree trunk + leaves).

## Ground Plane

```tsx
<mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
  <planeGeometry args={[100, 100]} />
  <meshStandardMaterial color="#4a7c59" />
</mesh>
```

For infinite-looking ground, make it large and match the far edge to the fog
color.
