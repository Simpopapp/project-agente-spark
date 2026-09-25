---
name: camera-rigs
description: Third-person follow, chase, first-person, and orbit camera implementations.
metadata:
  tags: camera, follow, chase, first-person, orbit
---

# Camera Rigs

## Third-Person Follow

Lerp the camera toward an offset behind the player. Smooth and works for most
games:

```tsx
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const offset = new THREE.Vector3(0, 8, 12);
const target = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

function FollowCamera({ playerRef }: { playerRef: React.RefObject<THREE.Group> }) {
  useFrame(({ camera }, delta) => {
    if (!playerRef.current) return;
    const pos = playerRef.current.position;

    target.copy(pos).add(offset);
    camera.position.lerp(target, 1 - Math.exp(-4 * delta));

    lookTarget.copy(pos);
    lookTarget.y += 1.5;
    camera.lookAt(lookTarget);
  });

  return null;
}
```

Use `1 - Math.exp(-speed * delta)` for frame-rate-independent lerp instead of
a bare lerp factor.

## Chase Camera (Behind Player Facing Direction)

Follows behind the player's heading — good for racing and flying games:

```tsx
const idealOffset = new THREE.Vector3(0, 5, -12);
const idealLookAt = new THREE.Vector3(0, 2, 10);
const _chaseOffset = new THREE.Vector3();
const _chaseLookAt = new THREE.Vector3();
const _chaseLookTarget = new THREE.Vector3();

function ChaseCamera({ playerRef }: { playerRef: React.RefObject<THREE.Group> }) {
  useFrame(({ camera }, delta) => {
    if (!playerRef.current) return;
    const player = playerRef.current;
    const t = 1 - Math.exp(-3 * delta);

    _chaseOffset.copy(idealOffset).applyQuaternion(player.quaternion);
    _chaseOffset.add(player.position);
    camera.position.lerp(_chaseOffset, t);

    _chaseLookAt.copy(idealLookAt).applyQuaternion(player.quaternion);
    _chaseLookAt.add(player.position);
    _chaseLookTarget.lerp(_chaseLookAt, t);
    camera.lookAt(_chaseLookTarget);
  });

  return null;
}
```

## First-Person Camera

Camera at eye height, controlled by pointer lock mouse movement:

```tsx
function FirstPersonCamera({
  playerRef,
  rotation,
}: {
  playerRef: React.RefObject<THREE.Group>;
  rotation: React.RefObject<{ yaw: number; pitch: number }>;
}) {
  useFrame(({ camera }) => {
    if (!playerRef.current || !rotation.current) return;
    const pos = playerRef.current.position;
    camera.position.set(pos.x, pos.y + 1.7, pos.z);
    camera.rotation.order = "YXZ";
    camera.rotation.y = rotation.current.yaw;
    camera.rotation.x = rotation.current.pitch;
  });

  return null;
}
```

Pair with the pointer lock setup from `input-handling.md`.

## Orbit Camera (Viewers)

Use drei's `OrbitControls` for product viewers and non-game experiences:

```tsx
import { OrbitControls } from "@react-three/drei";

<OrbitControls
  enableDamping
  dampingFactor={0.1}
  minDistance={3}
  maxDistance={20}
  maxPolarAngle={Math.PI / 2}
/>
```

Do not use orbit controls for games — they conflict with game camera logic.

For a static viewer with no continuous animation (a product showcase that only
moves when the user drags), set `<Canvas frameloop="demand">` so R3F renders
only on a change instead of 60×/sec. Pair with `OrbitControls`' `enableDamping`,
which keeps requesting frames while the inertia settles. Don't use `"demand"`
for a scene with an always-running `useFrame` loop.

## Camera Effects

### FOV Change for Speed

Widen the field of view as the player speeds up:

```tsx
useFrame(({ camera }, delta) => {
  const targetFov = 60 + speed * 0.3;
  (camera as THREE.PerspectiveCamera).fov += (targetFov - (camera as THREE.PerspectiveCamera).fov) * 3 * delta;
  (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
});
```

### Camera Shake

Add small random offsets on impact. Remove the previous frame's offset
before applying a new one — accumulating raw offsets into `camera.position`
leaves the camera permanently displaced after the shake decays:

```tsx
const shake = useRef(0);
const shakeOffset = useRef({ x: 0, y: 0 });

function triggerShake(intensity = 1) {
  shake.current = intensity;
}

useFrame(({ camera }, delta) => {
  camera.position.x -= shakeOffset.current.x;
  camera.position.y -= shakeOffset.current.y;
  shakeOffset.current = { x: 0, y: 0 };

  if (shake.current > 0.01) {
    shakeOffset.current.x = (Math.random() - 0.5) * shake.current * 0.3;
    shakeOffset.current.y = (Math.random() - 0.5) * shake.current * 0.2;
    camera.position.x += shakeOffset.current.x;
    camera.position.y += shakeOffset.current.y;
    shake.current *= Math.exp(-8 * delta);
  }
});
```

Run this after the follow/chase rig's `useFrame` writes the base position
(declare it later in the tree, or give the rig a lower `useFrame` priority).

### Smooth Camera Lean on Lateral Movement

Tilt the camera roll during turns (racing games):

```tsx
useFrame(({ camera }, delta) => {
  const targetRoll = -lateralVelocity * 0.008;
  camera.rotation.z += (targetRoll - camera.rotation.z) * 4 * delta;
});
```
