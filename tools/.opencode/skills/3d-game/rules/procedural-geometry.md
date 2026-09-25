---
name: procedural-geometry
description: Building 3D objects from primitives, compound groups, custom BufferGeometry, and instanced meshes.
metadata:
  tags: geometry, primitives, procedural, instanced, buffer
---

# Procedural Geometry

Build everything from code. Primitive composition with good materials and
lighting produces striking low-poly visuals without any external model files.

## Primitive Palette

| Geometry | Good for |
| --- | --- |
| `boxGeometry` | Buildings, crates, walls, vehicles, voxels |
| `sphereGeometry` | Heads, balls, planets, foliage crowns |
| `cylinderGeometry` | Tree trunks, pillars, wheels, towers |
| `coneGeometry` | Trees (evergreen), roofs, spikes, leaves |
| `capsuleGeometry` | Characters, pills, rounded bodies |
| `torusGeometry` | Rings, donuts, collectibles |
| `planeGeometry` | Ground, walls, water, billboards |
| `dodecahedronGeometry` | Rocks, gems, low-poly spheres |
| `icosahedronGeometry` | Crystals, faceted globes |

## Compound Objects

Group primitives to build complex shapes. Each child positions relative to
the parent group:

```tsx
function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.5, 4, 6]} />
        <meshStandardMaterial color="#6b4a2a" flatShading />
      </mesh>
      {/* Foliage layers */}
      <mesh position={[0, 5, 0]} castShadow>
        <coneGeometry args={[2, 3, 6]} />
        <meshStandardMaterial color="#2d7d46" flatShading />
      </mesh>
      <mesh position={[0, 6.5, 0]} castShadow>
        <coneGeometry args={[1.5, 2.5, 6]} />
        <meshStandardMaterial color="#35905a" flatShading />
      </mesh>
    </group>
  );
}
```

### Low-Poly Car

```tsx
function Car() {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2, 0.6, 4.5]} />
        <meshStandardMaterial color="#e8e8f0" flatShading />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 1.1, -0.3]} castShadow>
        <boxGeometry args={[1.7, 0.6, 2]} />
        <meshStandardMaterial color="#1a2138" flatShading metalness={0.8} />
      </mesh>
      {/* Wheels */}
      {[[-1, 0.4, 1.3], [1, 0.4, 1.3], [-1, 0.4, -1.3], [1, 0.4, -1.3]].map(
        (pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.45, 0.45, 0.4, 10]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        )
      )}
    </group>
  );
}
```

### Low-Poly Character

```tsx
function Character() {
  return (
    <group>
      <mesh position={[0, 1.2, 0]} castShadow>
        <capsuleGeometry args={[0.4, 1.2, 4, 8]} />
        <meshStandardMaterial color="#4a90d9" flatShading />
      </mesh>
      <mesh position={[0, 2.3, 0]} castShadow>
        <sphereGeometry args={[0.4, 8, 6]} />
        <meshStandardMaterial color="#f0d0a0" flatShading />
      </mesh>
    </group>
  );
}
```

## Materials for Visual Variety

Vary material properties to differentiate objects without textures:

```tsx
// Metallic surface
<meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />

// Glowing object
<meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.5} />

// Flat-shaded low-poly look
<meshStandardMaterial color="#e74c3c" flatShading />

// Matte surface
<meshStandardMaterial color="#4a7c59" roughness={1} metalness={0} />
```

## Instanced Meshes

Use `InstancedMesh` when you need hundreds of the same object (trees, rocks,
grass, particles). One draw call for all instances:

```tsx
import { useRef, useEffect } from "react";
import * as THREE from "three";

function Forest({ count = 200 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 80,
        0,
        (Math.random() - 0.5) * 80
      );
      dummy.scale.setScalar(0.8 + Math.random() * 0.6);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [count]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow>
      <coneGeometry args={[1.5, 4, 6]} />
      <meshStandardMaterial color="#2d7d46" flatShading />
    </instancedMesh>
  );
}
```

## Custom BufferGeometry

For roads, terrain, or any shape that primitives can't express, build vertex
data directly:

```tsx
import { useMemo } from "react";
import * as THREE from "three";

function Terrain({ size = 40, segments = 20 }: { size?: number; segments?: number }) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    const pos = geo.attributes.position;
    // PlaneGeometry lies in the XY plane (normal +Z). Displace along Z — the
    // mesh's -90° X rotation below maps geometry Z to world-up Y.
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, Math.sin(x * 0.3) * Math.cos(y * 0.3) * 2);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [size, segments]);

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial color="#5a8c4a" flatShading />
    </mesh>
  );
}
```

## Ribbon Mesh from a Spline (Tracks, Roads)

For flat racing tracks, roads, or paths, build a ribbon mesh by offsetting
spline samples along their perpendicular vectors. This produces geometry AND
reusable right-vectors for analytic collision (see `physics-collision.md`).

```ts
function buildTrackGeometry(
  controlPoints: THREE.Vector3[],
  segments: number,
  halfWidth: number
) {
  const curve = new THREE.CatmullRomCurve3(controlPoints, true);
  const pts = curve.getSpacedPoints(segments);

  // Centerline and right-vectors (2D, XZ plane)
  const centerline: THREE.Vector2[] = [];
  const rights: THREE.Vector2[] = [];
  for (let i = 0; i < segments; i++) {
    centerline.push(new THREE.Vector2(pts[i].x, pts[i].z));
  }
  for (let i = 0; i < segments; i++) {
    const a = centerline[(i - 1 + segments) % segments];
    const b = centerline[(i + 1) % segments];
    const tx = b.x - a.x, tz = b.y - a.y;
    const len = Math.hypot(tx, tz) || 1;
    rights.push(new THREE.Vector2(tz / len, -tx / len));
  }

  // Build vertex strip
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let arcLen = 0;

  for (let i = 0; i < segments; i++) {
    const c = centerline[i], r = rights[i];
    const lx = c.x - r.x * halfWidth, lz = c.y - r.y * halfWidth;
    const rx = c.x + r.x * halfWidth, rz = c.y + r.y * halfWidth;
    const y = pts[i].y;

    positions.push(lx, y, lz, rx, y, rz);

    // Advance V to this pair's cumulative arc length BEFORE pushing its UVs,
    // so pair i gets sum(d_1..d_i) — not one segment short (smear + seam).
    if (i > 0) {
      const prev = centerline[i - 1];
      arcLen += Math.hypot(c.x - prev.x, c.y - prev.y) / (halfWidth * 2);
      const v = (i - 1) * 2;
      // Wind CCW so face normals point +Y (up) — else FrontSide culls the road
      // from any camera above it and the player drives on an invisible track.
      indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
    }
    uvs.push(0, arcLen, 1, arcLen);
  }
  // Close loop
  const v = (segments - 1) * 2;
  indices.push(v, 0, v + 1, v + 1, 0, 1);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return { geometry: geo, centerline, rights };
}
```

Use in R3F:

```tsx
const { geometry, centerline, rights } = useMemo(
  () => buildTrackGeometry(controlPoints, 200, 8),
  []
);

<mesh receiveShadow>
  <primitive object={geometry} attach="geometry" />
  <meshStandardMaterial color="#333" flatShading />
</mesh>
```

Pass `centerline` and `rights` to the collision system for zero-cost
track-boundary detection.

## Extrude Along a Path (Tubes, Rails)

For round cross-sections (pipes, rails, tentacles):

```tsx
const curve = new THREE.CatmullRomCurve3(controlPoints, true);

<mesh>
  <tubeGeometry args={[curve, 64, 0.5, 8, true]} />
  <meshStandardMaterial color="#333" />
</mesh>
```

## Merged Static Geometry

For many identical decorations (fence posts, barrels, crates), merge them
into a single geometry to reduce draw calls:

```ts
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

function buildFenceGeometry(posts: THREE.Vector3[]) {
  const geos: THREE.BufferGeometry[] = [];
  const base = new THREE.CylinderGeometry(0.1, 0.1, 2, 6);
  for (const p of posts) {
    const g = base.clone();
    g.translate(p.x, p.y + 1, p.z);
    geos.push(g);
  }
  return mergeGeometries(geos);
}
```

Use `mergeGeometries` for static scenery. Use `InstancedMesh` (see above)
when you need to update individual transforms at runtime.
