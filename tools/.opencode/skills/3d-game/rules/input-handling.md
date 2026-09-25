---
name: input-handling
description: Keyboard, mouse, touch input hooks and pointer lock for Three.js games.
metadata:
  tags: input, keyboard, mouse, touch, pointer-lock
---

# Input Handling

## Keyboard Input Hook

Track which keys are held down via a ref. Read the ref inside `useFrame` —
never move the player inside the event handler itself:

```tsx
import { useEffect, useRef } from "react";

export function useKeyboard() {
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.code);

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  return keys;
}
```

Use `e.code` (layout-independent physical key) instead of `e.key`:

| Input | Code |
| --- | --- |
| W / Up | `KeyW` / `ArrowUp` |
| A / Left | `KeyA` / `ArrowLeft` |
| S / Down | `KeyS` / `ArrowDown` |
| D / Right | `KeyD` / `ArrowRight` |
| Space | `Space` |
| Shift | `ShiftLeft` |
| Escape | `Escape` |

## Reading Input in useFrame

```tsx
const keys = useKeyboard();

useFrame((_, delta) => {
  const k = keys.current;
  const dx = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0)
           - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
  const dz = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0)
           - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);

  // Normalize diagonal movement
  const len = Math.sqrt(dx * dx + dz * dz) || 1;
  playerRef.current!.position.x += (dx / len) * speed * delta;
  playerRef.current!.position.z -= (dz / len) * speed * delta;
});
```

**Move relative to the camera, not the world.** The example above moves along
fixed *world* axes — correct only for a fixed top-down or axis-locked camera.
With a follow, chase, angled, or orbiting camera (most 3D games), raw world-axis
WASD feels wrong the instant the camera turns: "up is down", strafing inverted.
This is the #1 controls bug. Transform the input by the camera's flat facing
first (reuse the vectors — no per-frame allocation):

```tsx
const FORWARD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const MOVE = new THREE.Vector3();

useFrame((state, delta) => {
  const fwd = (k.has("KeyW") ? 1 : 0) - (k.has("KeyS") ? 1 : 0);
  const strafe = (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0);
  state.camera.getWorldDirection(FORWARD);
  FORWARD.y = 0;
  FORWARD.normalize();                              // camera's flat forward
  RIGHT.crossVectors(FORWARD, state.camera.up).normalize();
  MOVE.set(0, 0, 0).addScaledVector(FORWARD, fwd).addScaledVector(RIGHT, strafe);
  if (MOVE.lengthSq() > 0) {
    MOVE.normalize().multiplyScalar(speed * delta);
    player.position.add(MOVE);
  }
});
```

For a third-person character that turns to face its heading, rotate input by
the *character's* yaw instead. **Verify after building:** W moves the player the
way the camera looks and A/D match screen-left/right — don't trust a
"camera-relative" comment over an actual check.

The arcade-vehicle model in `physics-collision.md` is the other case: forward is
**+Z** at yaw 0 and the car moves along its own heading — feed W/S to the
vehicle's `forward` (throttle) and A/D to `steer`, never the raw world
translation.

## Mouse Input

### Click on 3D Objects

R3F meshes support pointer events directly:

```tsx
<mesh
  onClick={(e) => {
    e.stopPropagation();
    console.log("clicked", e.point);
  }}
  onPointerOver={() => setHovered(true)}
  onPointerOut={() => setHovered(false)}
>
```

### Mouse Position (Continuous)

```tsx
const mouse = useRef({ x: 0, y: 0 });

useEffect(() => {
  const onMove = (e: MouseEvent) => {
    mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };
  window.addEventListener("mousemove", onMove);
  return () => window.removeEventListener("mousemove", onMove);
}, []);
```

## Pointer Lock (First-Person Games)

Lock the cursor to the canvas for FPS-style mouse look:

```tsx
const canvasRef = useRef<HTMLDivElement>(null);
const rotation = useRef({ yaw: 0, pitch: 0 });

useEffect(() => {
  const el = canvasRef.current;
  if (!el) return;

  const onClick = () => el.requestPointerLock();
  const onMove = (e: MouseEvent) => {
    if (document.pointerLockElement !== el) return;
    rotation.current.yaw -= e.movementX * 0.002;
    rotation.current.pitch -= e.movementY * 0.002;
    rotation.current.pitch = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, rotation.current.pitch)
    );
  };

  el.addEventListener("click", onClick);
  document.addEventListener("mousemove", onMove);
  return () => {
    el.removeEventListener("click", onClick);
    document.removeEventListener("mousemove", onMove);
  };
}, []);
```

Wrap `<Canvas>` in a div with this ref:

```tsx
<div ref={canvasRef} className="fixed inset-0">
  <Canvas>...</Canvas>
</div>
```

## Touch Input

For mobile, add a virtual joystick in the DOM overlay:

```tsx
function VirtualJoystick({ onMove }: { onMove: (dx: number, dy: number) => void }) {
  const origin = useRef({ x: 0, y: 0 });

  return (
    <div
      className="fixed bottom-8 left-8 w-32 h-32 rounded-full bg-white/20 border border-white/30 pointer-events-auto touch-none"
      onTouchStart={(e) => {
        const t = e.touches[0];
        origin.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        const dx = (t.clientX - origin.current.x) / 64;
        const dy = (t.clientY - origin.current.y) / 64;
        onMove(
          Math.max(-1, Math.min(1, dx)),
          Math.max(-1, Math.min(1, dy))
        );
      }}
      onTouchEnd={() => onMove(0, 0)}
    />
  );
}
```

Store the joystick output in a ref and read it in `useFrame` alongside
keyboard input.
