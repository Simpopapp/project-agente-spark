---
name: decision-framework
description: The escalation test for each technical choice (models, art pipeline, physics, collision, audio, camera) — when to use the simple approach versus escalating to the harder one.
metadata:
  tags: decisions, escalation, scope, models, physics, collision, audio, camera
---

# Decision Framework

For each technical choice, apply the **escalation test**: does the brief's
quality bar require the harder approach? Escalate only when the simpler option
provably fails a requirement — but don't under-build a named requirement either
(a recognizable object needs a real model, not a primitive).

| Step | Decision | Simple → Complex |
| --- | --- | --- |
| 1 | **Models & geometry** | Procedural primitives (abstract / stylized / voxel / generated forms) → **CC0 GLB for any recognizable named object — props AND characters/animals** (car, knight, player, enemy, animal, tree, weapon, building; Kenney/Quaternius character kits ship pre-rigged + animated, so a character GLB is the default, not the hard path) → bespoke rigged GLB. Crowd exception: for many small or distant units (a full team, a swarm), simplified procedural bodies are a legitimate finish — the GLB rule binds for the hero and anything the camera gets close to. A box-and-cone approximation of a named object is a placeholder, not a finish, and low-poly is no excuse (CC0 kits are low-poly). Source it (`model-sourcing.md`). |
| 2 | **Art pipeline** | Lit + textured surfaces + environment map → canvas/CC0 textures → RTT + post-processing shader (flat untextured color is a deliberate minimalist choice, not the default floor) |
| 3 | **Physics** | Kinematic (cosmetic) → custom arcade model → @react-three/rapier |
| 4 | **Collision** | World bounds clamp → AABB/sphere → analytic spline → physics engine |
| 5 | **Audio** | Silent → one-shot synth SFX → engine + lookahead music scheduler |
| 6 | **Camera** | Fixed → lerp follow → chase with lean → first-person pointer lock |

Examples:

- "Racing game with a sports car" → source a CC0 car GLB (poly.pizza / Kenney)
  and load it with `useGLTF` (`model-sourcing.md`), NOT a box chassis on
  cylinder wheels.
- "Drift racing game" → custom arcade physics (velocity decomposition), NOT
  turn-and-go, NOT a rigid body engine (`physics-collision.md`).
- "PC-98 style" or "retro look" → RTT pipeline with dithering/palette shader,
  NOT just bloom + vignette (`art-direction.md`).
- "Simple clicker" → kinematic + AABB, no physics engine.
