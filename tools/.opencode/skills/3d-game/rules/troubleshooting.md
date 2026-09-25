---
name: troubleshooting
description: Black screen fixes, R3F gotchas, performance tips, and disposal patterns.
metadata:
  tags: troubleshooting, black-screen, performance, dispose, debug
---

# Troubleshooting

## Black Screen Checklist

If the scene renders as a blank or black screen, check in order:

1. **No light.** `MeshStandardMaterial` and `MeshPhongMaterial` need light to
   be visible. Test with `<meshBasicMaterial color="red" />` — if the object
   appears, add a light.

2. **Camera inside or behind geometry.** Check `camera.position` — it must be
   outside the objects, facing them. Distances like `[0, 5, 10]` are a safe
   starting point.

3. **Camera near/far range.** Objects outside the near (default 0.1) to far
   (default 1000) range are clipped. Very large scenes need a larger `far`.

4. **Nothing in the scene.** Verify meshes are inside `<Canvas>` and not
   conditionally hidden.

5. **Canvas has zero size.** The parent div must have dimensions — use
   `className="fixed inset-0"` or explicit width/height.

6. **SSR rendered a placeholder, not the scene (TanStack Start).** The default
   stack server-renders; `<Canvas>` must never render on the server. If the
   route isn't client-only you get a blank/placeholder first frame or a
   hydration mismatch that leaves the canvas empty. Set `ssr: false` on the
   route that mounts the Canvas (see `project-setup.md`), and keep `window`/
   `document` access inside `useEffect`/`useFrame`, never at module or render
   scope.

7. **Material opacity or scale.** Check for `transparent` with `opacity={0}`,
   or geometry `scale={[0,0,0]}`.

8. **A child suspended the whole Canvas.** Any component inside `<Canvas>`
   that calls `useGLTF`, `useTexture`, or `useLoader` throws a promise on
   first load. Without a `<Suspense>` boundary *inside* the Canvas, the
   entire scene unmounts and you get a blank screen until the asset
   resolves — and if it errors, it stays blank. Always wrap async-loading
   components:

   ```tsx
   <Canvas>
     <Sky /> {/* renders immediately */}
     <Suspense fallback={null}>
       <CarWithGLB />
     </Suspense>
   </Canvas>
   ```

## Mutating Refs to Loaded/Cloned Scenes

When you clone a GLTF scene (e.g. with `SkeletonUtils.clone` or
`scene.clone()`) and need refs into the cloned subtree, **do not write
those refs during render** (in `useMemo`, the component body, or a
`useRef` initializer). The clone hasn't mounted yet, so `traverse` walks a
detached tree; the refs you store point at nodes React will discard, and
your `useFrame` animates ghosts. Symptoms: "wheels/bones randomly stop
animating after HMR or remount", "works once then breaks".

Write the refs in `useLayoutEffect` after the clone is in the scene:

```tsx
const clone = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf.scene]);
const wheelsRef = useRef<Wheel[] | null>(null);

useLayoutEffect(() => {
  const wheels: Wheel[] = [];
  clone.traverse((o) => { /* collect refs */ });
  wheelsRef.current = wheels;
  return () => { wheelsRef.current = null; };
}, [clone]);
```

## Object in the Wrong Place / Rotating Around the Wrong Point

Pivot, parenting, and world-vs-local frame bugs compile and render fine —
see `spatial-reasoning.md` for pivot groups, stale-matrix pitfalls, and
numeric placement verification.

## Debugging Per-Frame State

`console.log` inside `useFrame` fires 60×/sec and is unreadable. Build a
DOM HUD debug panel instead:

1. Store a `debugLines: string[]` in Zustand with a `setDebugLines` setter.
2. In the relevant `useFrame`, throttle (e.g. every 500–1200ms via a
   `useRef<number>` timestamp) and call `setDebugLines([...])`.
3. Render the lines in a fixed-position HUD div, gated by a debug toggle.

This gives you live values (positions, velocities, ref counts, mount
state) without flooding the console or causing per-frame re-renders.
Toggle it off for production.

## R3F-Specific Errors

**"R3F: Hooks can only be used within the Canvas component"** — R3F hooks
(`useFrame`, `useThree`, `useLoader`) must be called inside a component that
is a child of `<Canvas>`. They cannot be used in the parent component or in
the HUD.

**Multiple React instances** — if the app has two React copies (version
mismatch in dependencies), R3F hooks break silently or crash on mount with
`TypeError: Cannot read properties of null (reading 'useRef')` (or
`'useState'`). Run `bun why react` to check. Fix by aligning the fiber/drei
majors to the React major (fiber 8 / drei 9 ⟷ React 18; fiber 9 / drei 10 ⟷
React 19), then reinstall so the tree dedupes — do not chase fiber patch
versions; the crash is the duplicate React, not the patch release.

**White screen but the page chrome survives** — layout, nav, or a grid
background render while the 3D area is blank white: an uncaught error threw
inside the Canvas subtree and unmounted it. Wrap the 3D viewer in an error
boundary so the crash surfaces as a message instead of a silent blank, then
read the actual error in the console and fix it.

**Hydration mismatch ("A tree hydrated but some attributes … didn't match",
often naming `<StartClient>`)** — an SSR/client divergence in this app, not
framework noise; it will corrupt interactive state. Never dismiss it as a
separate issue. Diagnose per `project-setup.md` § Hydration.

**State updates in useFrame** — never call `useState` setters or trigger
React re-renders inside `useFrame`. Use `useRef` for mutable values, or
`useGameStore.getState()` (Zustand) for state access without subscription.

## Resize

R3F handles window resize automatically. No manual `resize` event listener
needed.

If you need the viewport size in a component:

```tsx
const { size } = useThree();
// size.width, size.height
```

## Color and Tone Mapping

If colors look washed out or too bright:

- Add `flat` prop to `<Canvas>` — disables tone mapping (good for stylized /
  non-PBR scenes)
- Or adjust: `<Canvas gl={{ toneMapping: THREE.NoToneMapping }}>`
- Color textures need `SRGBColorSpace`; data textures (normal, roughness)
  stay linear

## Performance

### Frame Budget

Target 60 fps. The sandbox runs software WebGL, so keep scenes lighter than
what real hardware handles — see the sandbox budget table in `SKILL.md`
(draw calls, triangles, shadow-map size, pixel ratio, post passes).

### Pixel Ratio

Use the `dpr` prop — `gl={{ pixelRatio }}` is not a renderer option and does
nothing:

```tsx
<Canvas dpr={[1, 2]}>
```

R3F already defaults to `[1, 2]`; set `dpr={1}` to claw back fill rate when a
scene is slow in the software-WebGL sandbox.

### Instancing

Hundreds of identical objects → use `<instancedMesh>` instead of individual
meshes. One draw call for all instances. See `procedural-geometry.md`.

### Reuse Objects

Allocate vectors, quaternions, and matrices outside the loop:

```tsx
// Good — allocated once
const tempVec = new THREE.Vector3();
useFrame(() => {
  tempVec.set(x, y, z);
  mesh.position.copy(tempVec);
});

// Bad — garbage every frame
useFrame(() => {
  mesh.position.copy(new THREE.Vector3(x, y, z));
});
```

### Shadows

- Only one directional light needs `castShadow`
- Tighten the shadow camera frustum to your play area
- Use `shadow-mapSize` of 1024 for most games
- Only place `castShadow` on objects that visually matter

### Object Pooling

For bullets, particles, or enemies that spawn/despawn frequently, maintain a
pool instead of creating/destroying meshes:

```tsx
const pool = useRef<THREE.Mesh[]>([]);
const activeCount = useRef(0);

function spawn() {
  if (activeCount.current < pool.current.length) {
    pool.current[activeCount.current].visible = true;
    activeCount.current++;
  }
}
```

### FPS Counter (Development)

```tsx
import { Stats } from "@react-three/drei";

<Canvas>
  {/* scene */}
  <Stats />
</Canvas>
```

Remove before shipping.

## Disposal

R3F disposes geometries and materials automatically when components unmount.
Manual disposal is only needed for programmatically created objects outside
the React tree:

```ts
function disposeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).geometry) {
      (child as THREE.Mesh).geometry.dispose();
    }
    const mat = (child as THREE.Mesh).material;
    if (mat) {
      const materials = Array.isArray(mat) ? mat : [mat];
      materials.forEach((m) => {
        Object.values(m).forEach((val) => {
          if (val && typeof val === "object" && "dispose" in val) {
            (val as { dispose: () => void }).dispose();
          }
        });
        m.dispose();
      });
    }
  });
}
```

## Z-Fighting

Flickering surfaces when two planes are coplanar. Fix by offsetting one
slightly:

```tsx
<mesh position-y={0.01}> {/* tiny offset above the ground */}
```

Or use `polygonOffset`:

```tsx
<meshStandardMaterial color="white" polygonOffset polygonOffsetFactor={-1} />
```

## WebGL Context Lost

If the browser reports "WebGL context lost", you have a GPU memory leak.
Check that removed objects have their geometry and materials disposed. Avoid
creating new materials or geometries inside `useFrame`.
