---
name: game-loop
description: Frame loop with useFrame, delta time, game state machine, Zustand state management, simple enemy AI, and particle bursts.
metadata:
  tags: game-loop, useFrame, delta-time, state, zustand, enemy-ai, particles
---

# Game Loop & State

## useFrame

R3F's `useFrame` runs every rendered frame (~60 fps). All game logic —
movement, physics, scoring, animation — goes here:

```tsx
import { useFrame } from "@react-three/fiber";

useFrame((state, delta) => {
  // state.clock  — elapsed time
  // state.camera — the active camera
  // state.scene  — the scene
  // delta         — seconds since last frame
});
```

**Delta time**: Always multiply movement by `delta`. Never use fixed
increments — they tie speed to frame rate:

```tsx
// Good — frame-rate independent
mesh.position.x += speed * delta;

// Bad — faster on 144Hz, slower on 30Hz
mesh.position.x += 0.1;
```

**Clamp delta** to prevent tunneling after a tab switch or lag spike:

```tsx
useFrame((_, rawDelta) => {
  const delta = Math.min(rawDelta, 0.05);
  // use clamped delta for all updates
});
```

## Game State Machine

Track game state with a simple string enum. Branch `useFrame` on the current
state:

```tsx
type GameState = "menu" | "playing" | "paused" | "gameover";

// With Zustand (recommended for sharing between 3D and HUD):
import { create } from "zustand";

interface GameStore {
  state: GameState;
  score: number;
  lives: number;
  timeLeft: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  gameOver: () => void;
  addScore: (points: number) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  state: "menu",
  score: 0,
  lives: 3,
  timeLeft: 90,
  start: () => set({ state: "playing", score: 0, lives: 3, timeLeft: 90 }),
  pause: () => set({ state: "paused" }),
  resume: () => set({ state: "playing" }),
  gameOver: () => set({ state: "gameover" }),
  addScore: (points) => set((s) => ({ score: s.score + points })),
  reset: () => set({ state: "menu", score: 0, lives: 3, timeLeft: 90 }),
}));
```

Use it in the game loop. Tick precise time in a ref and write to the store
only when the displayed value changes — a 60 Hz `setState` re-renders the
HUD every frame:

```tsx
const timeRef = useRef(90);

// The Scene that owns this loop stays mounted across restarts (HUD overlays
// sit on top of the always-mounted Canvas), so useRef(90) runs only once.
// Re-sync the precise timer on each new round, or PLAY AGAIN starts at ~0.
useEffect(
  () =>
    useGameStore.subscribe((s, prev) => {
      if (s.state === "playing" && prev.state !== "playing") timeRef.current = s.timeLeft;
    }),
  [],
);

useFrame((_, rawDelta) => {
  const delta = Math.min(rawDelta, 0.05);
  const { state, timeLeft } = useGameStore.getState();

  if (state !== "playing") return;

  timeRef.current -= delta;
  const shown = Math.max(0, Math.ceil(timeRef.current));
  if (shown !== timeLeft) useGameStore.setState({ timeLeft: shown });
  if (timeRef.current <= 0) {
    useGameStore.getState().gameOver();
    return;
  }

  // Update player, enemies, physics...
});
```

Access in the HUD (React re-renders on change):

```tsx
function HUD() {
  const score = useGameStore((s) => s.score);
  const timeLeft = useGameStore((s) => s.timeLeft);
  // ...
}
```

## Without Zustand

For simple games, `useRef` + callback props work fine:

```tsx
const scoreRef = useRef(0);
const stateRef = useRef<GameState>("menu");

useFrame((_, delta) => {
  if (stateRef.current !== "playing") return;
  // game logic using scoreRef.current...
});
```

The HUD won't auto-update from refs — trigger re-renders with `useState` or
periodic syncing.

## Spawning and Despawning

Two update rates are in play: positions change every frame (mutate refs, no
re-renders), the entity *list* changes rarely (React state, re-render mounts
and unmounts meshes). Mutating a ref array alone never re-renders — JSX
derived from it stays empty or frozen.

```tsx
const [ids, setIds] = useState<string[]>([]);          // list changes → re-render
const data = useRef(new Map<string, EnemyData>());     // per-frame state
const meshes = useRef(new Map<string, THREE.Mesh>());  // live mesh handles

function spawn(e: EnemyData) {
  data.current.set(e.id, e);
  setIds((prev) => [...prev, e.id]);
}

useFrame((_, delta) => {
  for (const [id, e] of data.current) {
    e.z += e.speed * delta;
    meshes.current.get(id)?.position.setZ(e.z);
    if (e.z > 50 || e.health <= 0) {
      data.current.delete(id);
      setIds((prev) => prev.filter((i) => i !== id)); // despawn re-render is rare
    }
  }
});

return ids.map((id) => (
  <mesh
    key={id}
    ref={(m) => { m ? meshes.current.set(id, m) : meshes.current.delete(id); }}
    castShadow
  >
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="red" />
  </mesh>
));
```

For dozens of short-lived objects per second (bullets, debris), skip React
entirely — use the instanced pool from "Particle Bursts & Trails" below.

## Fixed Timestep (Advanced)

For physics that must be deterministic, accumulate time and step at a fixed
rate:

```tsx
const accumulator = useRef(0);
const FIXED_DT = 1 / 60;

useFrame((_, delta) => {
  accumulator.current += Math.min(delta, 0.05);
  while (accumulator.current >= FIXED_DT) {
    physicsStep(FIXED_DT);
    accumulator.current -= FIXED_DT;
  }
});
```

## Simple Enemy AI

### Chase (steer toward the player)

Clamp turn rate so enemies arc instead of snapping, and stop at a radius so
they don't jitter on top of the player:

```tsx
const TURN_RATE = 2.5;   // rad/s
const ENEMY_SPEED = 4;
const STOP_RADIUS = 1.5;

function updateChaser(e: EnemyData, playerPos: THREE.Vector3, delta: number) {
  const dx = playerPos.x - e.position.x;
  const dz = playerPos.z - e.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist < STOP_RADIUS) return;

  // Steer heading toward the player, clamped to TURN_RATE
  const targetYaw = Math.atan2(dx, dz);
  let diff = Math.atan2(Math.sin(targetYaw - e.yaw), Math.cos(targetYaw - e.yaw));
  diff = Math.max(-TURN_RATE * delta, Math.min(TURN_RATE * delta, diff));
  e.yaw += diff;

  e.position.x += Math.sin(e.yaw) * ENEMY_SPEED * delta;
  e.position.z += Math.cos(e.yaw) * ENEMY_SPEED * delta;
}
```

### Waypoint Patrol

Advance to the next waypoint on proximity; loop the index:

```tsx
function updatePatroller(e: EnemyData, waypoints: THREE.Vector3[], delta: number) {
  const wp = waypoints[e.waypointIndex];
  const dx = wp.x - e.position.x;
  const dz = wp.z - e.position.z;
  const dist = Math.hypot(dx, dz);

  if (dist < 0.5) {
    e.waypointIndex = (e.waypointIndex + 1) % waypoints.length;
    return;
  }
  e.yaw = Math.atan2(dx, dz);
  e.position.x += (dx / dist) * ENEMY_SPEED * delta;
  e.position.z += (dz / dist) * ENEMY_SPEED * delta;
}
```

Run either from the spawning loop above. Combine: patrol until the player is
within an aggro radius, then switch to chase.

## Particle Bursts & Trails

One `<instancedMesh>` plus a pooled particle array — no per-particle React
components, no allocations during play (pooling rationale:
`troubleshooting.md`; instancing mechanics: `procedural-geometry.md`):

```tsx
const MAX_PARTICLES = 200;
const dummy = new THREE.Object3D();

type Particle = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number };
const particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
  x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0,
}));

function burst(at: THREE.Vector3, count = 20) {
  let spawned = 0;
  for (const p of particles) {
    if (p.life > 0 || spawned >= count) continue;
    p.x = at.x; p.y = at.y; p.z = at.z;
    p.vx = (Math.random() - 0.5) * 8;
    p.vy = Math.random() * 6 + 2;
    p.vz = (Math.random() - 0.5) * 8;
    p.life = 1;
    spawned++;
  }
}

function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    particles.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= delta * 1.5;
        p.vy -= 15 * delta; // gravity
        p.x += p.vx * delta; p.y += p.vy * delta; p.z += p.vz * delta;
        dummy.position.set(p.x, p.y, p.z);
        dummy.scale.setScalar(Math.max(p.life, 0) * 0.3);
      } else {
        dummy.scale.setScalar(0); // hide dead instances
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#ffaa33" />
    </instancedMesh>
  );
}
```

Trails: call `burst(position, 1)` every N ms from the moving object's
`useFrame` with low initial velocity.
