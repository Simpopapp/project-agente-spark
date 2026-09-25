---
name: physics-collision
description: Arcade vehicle physics with drift, AABB collision, raycasting, analytic spline collision, and optional @react-three/rapier.
metadata:
  tags: collision, physics, aabb, raycasting, rapier, vehicle, drift
---

# Physics & Collision

Choose physics fidelity by how central the mechanic is:

| Centrality | Model | Example |
| --- | --- | --- |
| Cosmetic | Kinematic (set position directly) | NPCs, background objects |
| Core handling | Custom arcade model | Racing, driving, flying |
| Realism required | @react-three/rapier | Ragdoll, stacking, joints |

## Arcade Vehicle Physics (Drift / Racing)

Velocity decomposition into longitudinal (forward) and lateral (sideways)
components. Lateral grip is an exponential decay — frame-rate independent.
Slip angle drives drift scoring, audio pitch, and camera lean.

```ts
// Named constants — tune feel by adjusting these, not rewriting the model
const ACCEL = 25;
const BRAKE = 15;
const DRAG = 1.2;
const TURN = 2.5;
const GRIP = 6.0;
const DRIFT_GRIP = 1.35;

interface VehicleState {
  px: number; pz: number;
  vx: number; vz: number;
  yaw: number;
  slip: number;
  speed: number;
}

function updateVehicle(
  s: VehicleState,
  input: { forward: number; steer: number; brake: boolean },
  dt: number
) {
  // Forward is +Z at yaw 0 (fd = (sin yaw, cos yaw)). NB this differs from the
  // generic keyboard hook in input-handling.md, which translates toward -Z;
  // wire W/S to input.forward and A/D to input.steer, not that world translation.
  const fdx = Math.sin(s.yaw), fdz = Math.cos(s.yaw);
  const rdx = Math.cos(s.yaw), rdz = -Math.sin(s.yaw);

  // Decompose velocity into local axes
  let vLong = s.vx * fdx + s.vz * fdz;
  let vLat  = s.vx * rdx + s.vz * rdz;

  // Acceleration and drag
  vLong += input.forward * ACCEL * dt;
  if (input.brake) vLong -= Math.sign(vLong) * BRAKE * dt;
  vLong -= vLong * DRAG * dt;

  // Steering (scales with speed, amplified during drift)
  const speedFactor = Math.min(Math.abs(vLong) / 9, 1);
  s.yaw += input.steer * TURN * speedFactor * (input.brake ? 1.5 : 1) * dt;

  // Lateral grip — FRAME-RATE INDEPENDENT exponential decay
  const grip = input.brake ? DRIFT_GRIP : GRIP;
  vLat *= Math.exp(-grip * dt);

  // Recompose world velocity
  s.vx = fdx * vLong + rdx * vLat;
  s.vz = fdz * vLong + rdz * vLat;

  // Integrate position
  s.px += s.vx * dt;
  s.pz += s.vz * dt;

  // Slip angle — used for scoring, audio, camera lean
  s.speed = Math.sqrt(s.vx * s.vx + s.vz * s.vz);
  // atan2(0,0)=0, so a stationary car would read slip=-yaw (spurious lean/
  // scoring/audio on a parked or just-reset car); gate on speed.
  const va = Math.atan2(s.vx, s.vz);
  s.slip = s.speed > 0.1 ? Math.atan2(Math.sin(va - s.yaw), Math.cos(va - s.yaw)) : 0;
}
```

Use in R3F:

```tsx
const vehicle = useRef<VehicleState>({
  px: 0, pz: 0, vx: 0, vz: 0, yaw: 0, slip: 0, speed: 0,
});
const keys = useKeyboard();

useFrame((_, rawDelta) => {
  const dt = Math.min(rawDelta, 0.05);
  const k = keys.current;
  updateVehicle(vehicle.current, {
    forward: (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0)
           - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0),
    steer: (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0)
         - (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0),
    brake: k.has("Space"),
  }, dt);

  const s = vehicle.current;
  carRef.current!.position.set(s.px, 0, s.pz);
  carRef.current!.rotation.y = s.yaw;
});
```

### Visual Lean (Tilt on Drift)

Separate the visual group from the physics position so the car leans into
turns without affecting collision:

```tsx
// Parent group: physics position + yaw
// Child group: visual lean (roll from slip, pitch from accel)
const leanRef = useRef<THREE.Group>(null);

useFrame((_, delta) => {
  if (!leanRef.current) return;
  const s = vehicle.current;
  const targetRoll = -s.slip * 0.15;
  leanRef.current.rotation.z += (targetRoll - leanRef.current.rotation.z) * 5 * delta;
});
```

## Platformer Physics (Jump Curve)

Variable-height jump with coyote time:

```ts
const GRAVITY = -30;
const JUMP_VEL = 12;
const COYOTE_TIME = 0.1;

interface PlatformerState {
  py: number;
  vy: number;
  grounded: boolean;
  coyoteTimer: number;
  jumpHeld: boolean;
}

function updatePlatformer(s: PlatformerState, jumpPressed: boolean, dt: number) {
  if (s.grounded) s.coyoteTimer = COYOTE_TIME;
  else s.coyoteTimer -= dt;

  if (jumpPressed && !s.jumpHeld && s.coyoteTimer > 0) {
    s.vy = JUMP_VEL;
    s.grounded = false;
    s.coyoteTimer = 0;
  }
  // Cut jump short once, on the release edge (variable height). Gating on the
  // previous frame's jumpHeld makes it a one-shot — without it the *= 0.5
  // re-fires every released frame and collapses the jump in ~80ms.
  if (!jumpPressed && s.jumpHeld && s.vy > 0) s.vy *= 0.5;
  s.jumpHeld = jumpPressed;

  s.vy += GRAVITY * dt;
  s.py += s.vy * dt;
  if (s.py <= 0) { s.py = 0; s.vy = 0; s.grounded = true; }
}
```

## AABB Collision (Box vs Box)

Fast, works for blocky worlds:

```ts
const playerBox = new THREE.Box3();
const obstacleBox = new THREE.Box3();

function checkCollision(
  playerPos: THREE.Vector3,
  playerSize: THREE.Vector3,
  obstacles: { position: THREE.Vector3; box: THREE.Box3 }[]
): boolean {
  playerBox.setFromCenterAndSize(playerPos, playerSize);
  for (const obs of obstacles) {
    if (playerBox.intersectsBox(obs.box)) return true;
  }
  return false;
}
```

### Per-Axis Resolution (Slide Along Walls)

Test X and Z movement separately so the player slides along walls:

```tsx
const nextPos = new THREE.Vector3();

useFrame((_, delta) => {
  const dx = inputX * speed * delta;
  const dz = inputZ * speed * delta;

  nextPos.copy(player.position);
  nextPos.x += dx;
  if (!checkCollision(nextPos, playerSize, obstacles)) {
    player.position.x = nextPos.x;
  }

  nextPos.copy(player.position);
  nextPos.z += dz;
  if (!checkCollision(nextPos, playerSize, obstacles)) {
    player.position.z = nextPos.z;
  }
});
```

## Sphere Collision

```ts
function sphereCollision(
  posA: THREE.Vector3, radiusA: number,
  posB: THREE.Vector3, radiusB: number
): boolean {
  return posA.distanceTo(posB) < radiusA + radiusB;
}
```

## Analytic Spline Collision (Racing Tracks)

When the world is a track defined by a spline, collision is a distance check —
no spatial data structure needed. Reuse the spline's right-vectors for both
mesh generation and collision:

```ts
// Pre-computed from the track spline (shared with geometry builder)
const trackPoints: THREE.Vector2[];  // centerline XZ
const trackRights: THREE.Vector2[];  // perpendicular at each sample
let trackIdx = 0;

function trackCollide(px: number, pz: number, halfWidth: number) {
  // Local search around last known index
  let best = trackIdx, bestDist = 1e18;
  const n = trackPoints.length;
  for (let k = -5; k <= 14; k++) {
    const j = ((trackIdx + k) % n + n) % n;
    const dx = px - trackPoints[j].x;
    const dz = pz - trackPoints[j].y;
    const d = dx * dx + dz * dz;
    if (d < bestDist) { bestDist = d; best = j; }
  }
  trackIdx = best;

  // Signed lateral offset from centerline
  const r = trackRights[best];
  const lat = (px - trackPoints[best].x) * r.x + (pz - trackPoints[best].y) * r.y;

  // Clamp to track bounds
  const limit = halfWidth - 1.3;
  if (Math.abs(lat) > limit) {
    const sign = Math.sign(lat);
    const push = (Math.abs(lat) - limit);
    return { offTrack: true, pushX: -sign * r.x * push, pushZ: -sign * r.y * push };
  }
  return { offTrack: false, pushX: 0, pushZ: 0 };
}
```

## Ground Clamping and World Bounds

```tsx
player.position.y = Math.max(0, player.position.y);

const BOUNDS = 50;
player.position.x = Math.max(-BOUNDS, Math.min(BOUNDS, player.position.x));
player.position.z = Math.max(-BOUNDS, Math.min(BOUNDS, player.position.z));
```

## Raycasting

### Ground Snapping (Terrain Following)

```tsx
const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);
const rayOrigin = new THREE.Vector3();

useFrame(() => {
  rayOrigin.set(player.position.x, 100, player.position.z);
  raycaster.set(rayOrigin, down);
  const hits = raycaster.intersectObject(terrain, true);
  if (hits.length > 0) {
    player.position.y = hits[0].point.y;
  }
});
```

### Hitscan Shooting

```tsx
raycaster.setFromCamera({ x: 0, y: 0 }, camera);
const hits = raycaster.intersectObjects(enemies);
if (hits.length > 0) {
  hits[0].object.userData.takeDamage(10);
}
```

## @react-three/rapier (Full Physics)

Install only when you need rigid body dynamics, joints, or complex physics:

```bash
bun add @react-three/rapier
```

```tsx
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";

function PhysicsScene() {
  return (
    <Physics gravity={[0, -9.81, 0]}>
      <RigidBody>
        <mesh castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed">
        <mesh receiveShadow>
          <boxGeometry args={[50, 0.5, 50]} />
          <meshStandardMaterial color="#4a7c59" />
        </mesh>
      </RigidBody>
    </Physics>
  );
}
```
