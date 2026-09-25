---
name: spatial-reasoning
description: Coordinate frames, pivots, world-space math, and numeric verification for positioning, parenting, and combining 3D objects.
metadata:
  tags: spatial, coordinates, pivot, rotation, quaternion, placement
---

# Spatial Reasoning & Placement

Spatial bugs don't throw — a wrong pivot or flipped axis compiles, renders,
and puts the door inside the wall. For non-trivial placement, compute where
things should land and verify the numbers; don't trust intuition.

## Coordinate Frame (three.js)

- Right-handed, **Y-up**: +X right, +Y up, +Z toward the viewer.
- The ground plane is XZ; height is Y. The default camera looks down **−Z**.
- Rotations are in **radians**. Right-hand rule: positive rotation about an
  axis is counter-clockwise viewed from that axis's positive end.
- Pick a unit (1 unit = 1 m) and keep it consistent across the project.

## Pivots

An object rotates and scales about its own origin. When the origin isn't
where the hinge should be (wheels, doors, turrets, arm joints), don't fight
the geometry — wrap it in a group whose origin IS the pivot, offset the mesh
inside, and rotate the group:

```tsx
{/* Door hinged on its left edge */}
<group ref={hingeRef} position={[doorX, 0, doorZ]}>
  <mesh position={[DOOR_WIDTH / 2, DOOR_HEIGHT / 2, 0]}>
    <boxGeometry args={[DOOR_WIDTH, DOOR_HEIGHT, 0.05]} />
    <meshStandardMaterial color="#7a5230" />
  </mesh>
</group>
```

`hingeRef.current.rotation.y` now swings the door around its edge. Same
pattern fixes a loaded model whose origin is misplaced: wrap, offset the
`<primitive>`, transform the group.

## World-Space Directions

After any rotation, "forward" is no longer a fixed axis literal. Derive
world directions from the object's quaternion, not from guesses:

```tsx
const FORWARD = new THREE.Vector3(0, 0, -1); // name your local forward once
const worldForward = FORWARD.clone().applyQuaternion(
  obj.getWorldQuaternion(new THREE.Quaternion())
);
```

`getWorldDirection()` is asymmetric: plain objects return their local **+Z**
in world space, but cameras override it to return **−Z** — the direction the
camera looks. Don't reuse one mental model for both.

Single-axis rotations (`rotation.y` for yaw) are fine as plain Euler — every
recipe in this skill does that. Compose multi-axis rotations with
quaternions (`qa.multiply(qb)`): no gimbal lock, but order still matters —
`qa.multiply(qb)` ≠ `qb.multiply(qa)`.

## Stale World Matrices

World matrices refresh once per frame during render. Reading a world
position or bounds outside the loop — right after building the graph — can
see stale **ancestor** transforms: `Box3.setFromObject` refreshes the object
itself but not its ancestors. Refresh explicitly first:

```ts
obj.updateWorldMatrix(true, true); // ancestors + descendants
const box = new THREE.Box3().setFromObject(obj);
```

## Combining Objects

1. Normalize each model in isolation — center, scale, feet at y=0 — *before*
   parenting (recipe in `models-and-animation.md`).
2. Parent by JSX nesting; child transforms are relative to the parent.
   Imperative escape hatch: `parent.add(child)` keeps the child's *local*
   transform (its world position jumps); `parent.attach(child)` preserves
   the *world* transform. This `attach` is unrelated to R3F's `attach` JSX
   prop.
3. After assembly, re-check the combined bounds with a fresh
   `Box3.setFromObject` on the group — assembly moves things.

## Verify Placement Numerically

For layouts where exact positions matter, derive the expected world position
by hand, assert it, and check via the console. A screenshot can miss a
half-unit offset; an assert can't:

```tsx
// upperArm at (0,2,0) under base; forearm at (0,1.5,0) under upperArm.
// upperArm rotated +90° about Z → forearm offset (0,1.5,0) lands at (-1.5,0,0)
// → expected forearm world position: (-1.5, 2, 0)
useEffect(() => {
  base.current!.updateWorldMatrix(true, true);
  const got = forearm.current!.getWorldPosition(new THREE.Vector3());
  console.assert(
    got.distanceTo(new THREE.Vector3(-1.5, 2, 0)) < 1e-6,
    "forearm world pos wrong:", got.toArray()
  );
}, []);
```

The hand-derivation is the verification — the code running proves nothing.
Remove asserts once placement is confirmed.

## Visual Debug Helpers

While debugging placement, make the frame and bounds visible — a flipped
axis is instant to spot on screen and nearly invisible in code:

```tsx
<axesHelper args={[5]} />       {/* red=+X, green=+Y, blue=+Z */}
<gridHelper args={[10, 10]} />  {/* lies in the XZ ground plane */}
```

```ts
scene.add(new THREE.Box3Helper(box, 0xffff00)); // show computed bounds
```

Remove helpers before shipping.
