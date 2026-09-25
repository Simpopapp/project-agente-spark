---
name: models-and-animation
description: Loading GLB models with useGLTF, playing and crossfading animation clips, cloning for multiple instances, normalizing scale, and loading-progress UX.
metadata:
  tags: models, glb, gltf, animation, useGLTF, useAnimations
---

# Models & Animation

Procedural assets stay the default. Reach for GLB models when:

| Situation | Source |
| --- | --- |
| User uploaded a `.glb`/`.gltf` | Copy it into the project (below) |
| Brief needs organic shapes or skeletal animation (characters, animals) | Find a CC0 model — see `model-sourcing.md` |
| Brief names a real-world object with a known CC0 source (car, tree, rock, crate, weapon, building) | Prefer a CC0 model — looks better than a primitive approximation — see `model-sourcing.md` |
| Abstract, stylized, voxel, or generated geometry | Stay procedural — see `procedural-geometry.md` |

## Getting the File Into the Project

User-uploaded files live in the `user-uploads://` namespace:

```
code--exec cp /tmp/user-uploads/character.glb public/models/character.glb
```

For models found online, follow `model-sourcing.md` (CC0 only, downloaded
with curl into `public/models/`).

## Loading with useGLTF

```tsx
import { useGLTF } from "@react-three/drei";

function Character() {
  const { scene } = useGLTF("/models/character.glb");
  return <primitive object={scene} />;
}

useGLTF.preload("/models/character.glb");
```

The component must sit inside `<Suspense>` *inside* the Canvas, or the whole
scene blanks on first load — see the Black Screen Checklist in
`troubleshooting.md`.

## Shadows on Loaded Models

Imported meshes don't cast or receive shadows by default. Enable after load:

```tsx
const { scene } = useGLTF("/models/character.glb");

useEffect(() => {
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}, [scene]);
```

`useGLTF` caches by URL, so these flags land on the shared scene and affect
every instance — for shadow flags that's usually what you want. When you
clone per instance (below), traverse the clone instead. Transforms (scale,
position) must NEVER be set on the shared scene — see Normalizing.

## Multiple Instances of One Model

`useGLTF` caches by URL — every component gets the **same** scene object.
Rendering it twice silently shows it once. Clone per instance, and use
`SkeletonUtils.clone` (a plain `scene.clone()` breaks skinned/rigged meshes):

```tsx
import { SkeletonUtils } from "three-stdlib";

function Enemy() {
  const { scene } = useGLTF("/models/enemy.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  return <primitive object={clone} />;
}
```

Refs into the cloned subtree must be assigned in `useLayoutEffect`, not during
render — see "Mutating Refs to Loaded/Cloned Scenes" in `troubleshooting.md`.

## Animations with useAnimations

```tsx
import { useGLTF, useAnimations } from "@react-three/drei";

function Character() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/models/character.glb");
  const { actions, names } = useAnimations(animations, group);

  // names — every clip in the file, e.g. ["Idle", "Run", "Jump"]
  useEffect(() => {
    actions[names[0]]?.reset().play();
  }, [actions, names]);

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}
```

### Crossfading Between Clips

Switch clips with a fade, driven by game state:

```tsx
const FADE = 0.25;

function useClip(actions: ReturnType<typeof useAnimations>["actions"], clip: string) {
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (prev.current === clip) return;
    if (prev.current) actions[prev.current]?.fadeOut(FADE);
    actions[clip]?.reset().fadeIn(FADE).play();
    prev.current = clip;
  }, [actions, clip]);
}

// In the component: derive the clip name from game state
const speed = useGameStore((s) => s.playerSpeed);
useClip(actions, speed > 0.1 ? "Run" : "Idle");
```

One-shot clips (jump, attack): set `loop` and clamp, then return to the base
clip when finished:

```tsx
const jump = actions["Jump"];
if (jump) {
  jump.setLoop(THREE.LoopOnce, 1);
  jump.clampWhenFinished = true;
  jump.reset().play();
}
```

Clip names vary per model — always read `names` (or log it once) instead of
guessing `"Idle"`/`"Walk"`.

## Normalizing Arbitrary Models

Downloaded models arrive at unpredictable sizes and offsets. Normalize to a
target height with feet at y=0. **Clone first, normalize the clone** — the
`useGLTF` scene is a shared cache, and in-place transforms corrupt every
other instance (and compound on re-runs):

```tsx
function useNormalizedModel(source: THREE.Object3D, targetHeight = 2) {
  return useMemo(() => {
    const object = SkeletonUtils.clone(source);

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    object.scale.setScalar(targetHeight / (size.y || 1));

    // Recompute after scaling, then drop feet to ground level
    const scaled = new THREE.Box3().setFromObject(object);
    const center = scaled.getCenter(new THREE.Vector3());
    object.position.x -= center.x;
    object.position.z -= center.z;
    object.position.y -= scaled.min.y;
    return object;
  }, [source, targetHeight]);
}
```

Combining several models into one assembly (pivots, parenting, bounds
re-checks): see `spatial-reasoning.md`.

## Loading Progress UX

`<Suspense fallback={null}>` leaves the scene silently empty while a model
downloads. Show progress with drei's `useProgress` + `Html`:

```tsx
import { Html, useProgress } from "@react-three/drei";

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-white font-mono">{Math.round(progress)}%</div>
    </Html>
  );
}

<Suspense fallback={<Loader />}>
  <Character />
</Suspense>
```

### Never leave the canvas blank while a model loads

Suspend only the model, not the whole scene. Keep the ground, lights, camera,
environment, and HUD *outside* the `<Suspense>` boundary so they render on the
first frame — the viewport is then never a blank/black screen while the GLB
downloads, and if the model 404s or stalls the scene still shows (a lit stage
with the loader), not nothing. A product viewer should show its lit stage
immediately; only the product itself pops in when loaded.

```tsx
<Canvas>
  <Stage />            {/* lights + ground + environment: visible immediately */}
  <Suspense fallback={<Loader />}>
    <Model />          {/* only the GLB is suspended */}
  </Suspense>
</Canvas>
```

A large model is slow to fetch and decode in the sandbox preview (software
WebGL) and leaves the loader up longer — prefer a compact CC0 model (see
`model-sourcing.md`) and, after it loads, confirm the model is actually
visible rather than assuming it appeared (a stuck loader means the fetch
failed — check the network rule in the verify loop).
