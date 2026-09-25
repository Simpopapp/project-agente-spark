---
name: multiplayer
description: Casual online multiplayer over Lovable Cloud — choosing a sync model (same-screen, turn-based, realtime broadcast), the message budget, room codes and presence, client-authoritative state sync with interpolation, and two-client verification.
metadata:
  tags: multiplayer, networking, realtime, broadcast, presence, lobby, interpolation, turn-based
---

# Multiplayer

Casual online multiplayer — co-op, versus, party games, shared rooms — works
today as **client-authoritative state sync over Lovable Cloud** (Supabase
Realtime Broadcast + Presence). There is no game server on the platform:
deployed apps cannot host a WebSocket hub, so every player's browser talks to
the project's Cloud realtime channel instead.

**Requires Lovable Cloud.** If the project doesn't have Cloud, that's the
first step — no networking code before it exists.

**Still out of scope** — state the limitation instead of attempting:
server-authoritative simulation (anti-cheat, ranked/competitive integrity),
more than 8 players per room, twitch-precision hit registration (fighting
games, competitive shooters), voice chat, and WebRTC peer-to-peer.
Client-authoritative means any player's client can lie; that is fine for
casual play among people who share a room code, and wrong for anything
competitive.

## Pick the Sync Model First

| Brief | Model | Cost |
| --- | --- | --- |
| Two players, one screen ("2 player racing game", "vs mode") | Same-screen: two input maps, split camera — **no networking** | zero |
| Players act in turns or a few times a minute (chess, cards, word games) | Postgres rows + `postgres_changes` (§ Turn-Based Games) | ~zero |
| Players move continuously in a shared world (racing, tag, arena, co-op) | Broadcast state sync (the rest of this file) | scales N² × tick |

Don't network a game that doesn't need it: "2 player" means same-screen
unless the user says online. And don't broadcast a turn-based game: broadcast
state is ephemeral (a refresh loses the match), the database is not.

## The Message Budget — read before writing any networking

Every broadcast counts as 1 sent + 1 received per other player, so a room of
N players ticking at T Hz generates about **N² × T messages/second** — billed
as Cloud usage and rate-limited **per project** (all rooms combined, on the
order of a few hundred messages/second).

| Room | Net tick | msg/s | Verdict |
| --- | --- | --- | --- |
| 4 players | 8 Hz | ~130 | fine (~460K messages/hour of play) |
| 8 players | 4 Hz | ~260 | the 8-player ceiling — don't raise the tick |
| 8 players | 20 Hz | ~1,280 | over the limit — messages drop, game breaks |

Per-frame sending is not "expensive", it is **broken**: 60 Hz × a few players
exceeds the project-wide rate limit and the overflow is dropped. These rules
are load-bearing:

- **Size the tick to the room: keep N² × tick under ~250 msg/s** — half a
  typical project limit, so a lobby or a second room doesn't tip it over.
  That means 8 Hz up to 5 players, 6 Hz at 6, 4 Hz at 8 — never above 10 Hz.
  Smooth remotes come from interpolation, never from send rate.
- **Send on change only**, plus a ~1 s keepalive so late joiners get your
  position.
- **One channel per room**, rooms capped at 8 players.
- **Stop sending while `document.hidden`.**
- **Subscribe once, tear down always.** A channel created per render — or an
  effect without cleanup — reconnects in a loop and burns Cloud budget doing
  nothing; leaked realtime subscriptions are a top production cost bug.
  The hook below makes this structural: handlers flow through a ref so the
  effect depends only on the room.

A published game multiplies rooms against one project-wide budget. If the
user intends many concurrent public rooms, say that a room-based casual game
scales to dozens of concurrent players, not thousands.

## Architecture: Client Authority + Interpolation

Each client simulates and renders its own player exactly as in single-player
(`game-loop.md`, `physics-collision.md`) — networking changes nothing about
the local player. Around that:

- **Send**: broadcast your own position/heading at the net tick.
- **Receive**: store the latest state per remote player in a ref map.
- **Render**: damp remote avatars toward their latest state every frame with
  `Math.exp(-k * delta)`; snap when the gap is a teleport.
- **Presence** is the roster: join → spawn, leave → despawn, and the HUD's
  player list.
- **Spawn offset by player**: derive each spawn point from the player id
  (e.g. index in the sorted roster) so avatars don't stack at the origin.

Broadcast state is ephemeral. A refresh rejoins from live keepalives; persist
anything that must survive (scores, unlocks) to the Cloud database at round
end, never per tick.

Room codes are join keys, not security: anyone with the code can subscribe
and see every payload. No secrets in payloads. Auth-gated private channels
exist but add sign-in friction — only when the user asks for access control.

## Recipe

Uses the project's browser Supabase client (`@/integrations/supabase/client`
on both stacks — never `client.server` in game code). Everything below runs
client-side; the game already mounts under `ssr: false` (`project-setup.md`).

**src/lib/room.ts** — room code from the URL; the share link is the URL:

```ts
export function roomCodeFromUrl(): string {
  const url = new URL(window.location.href);
  const existing = url.searchParams.get("room");
  if (existing) return existing.toUpperCase();
  const code = Math.random().toString(36).slice(2, 6).toUpperCase();
  url.searchParams.set("room", code);
  window.history.replaceState(null, "", url);
  return code;
}
```

**src/hooks/useGameChannel.ts** — one channel per room, subscribed exactly
once, torn down always:

```tsx
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type NetState = {
  id: string; name: string;
  x: number; y: number; z: number;
  ry: number; // yaw
};

export const playerId = crypto.randomUUID();

type Handlers = {
  onState: (s: NetState) => void;
  onRoster: (roster: { id: string; name: string }[]) => void;
};

export function useGameChannel(roomCode: string, name: string, handlers: Handlers) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const h = useRef(handlers);
  h.current = handlers;

  useEffect(() => {
    const channel = supabase.channel(`game:${roomCode}`, {
      config: { broadcast: { self: false }, presence: { key: playerId } },
    });
    channel
      .on("broadcast", { event: "state" }, ({ payload }) => {
        const s = payload as NetState;
        if (s.id !== playerId) h.current.onState(s);
      })
      .on("presence", { event: "sync" }, () => {
        // fires after every join AND leave — the roster is the lifecycle source
        const roster = Object.entries(channel.presenceState<{ name: string }>())
          .map(([id, metas]) => ({ id, name: metas[0]?.name ?? "player" }));
        h.current.onRoster(roster);
      })
      .subscribe((status) => {
        console.log("[net] channel:", status); // the two-client verify reads this
        if (status === "SUBSCRIBED") channel.track({ name });
      });
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel); // skipping this = reconnect loop = cost bug
    };
    // handlers flow through h — only the room identity may re-run this effect
  }, [roomCode]);

  return channelRef;
}
```

`name` is captured when the channel subscribes — treat it as fixed for the
session; if the game allows renaming mid-session, call
`channelRef.current?.track({ name })` on change.

**Network component** — one component owns the channel, the send loop, and
the remote avatars. It is the **only** component that calls `useGameChannel`,
so there is exactly one channel and one subscribe per room. Presence drives
spawn/despawn (the spawn/despawn pattern from `game-loop.md`: ids in React
state, per-frame data in refs); state broadcasts only move players the roster
knows, so a late packet from someone who left cannot resurrect their avatar:

```tsx
const tmpTarget = new THREE.Vector3();
const NET_TICK = 1 / 8; // sized for ≤5 players — see The Message Budget

function Multiplayer({
  roomCode,
  name,
  playerRef,
}: {
  roomCode: string;
  name: string;
  playerRef: React.RefObject<THREE.Object3D | null>;
}) {
  const [ids, setIds] = useState<string[]>([]);
  const roster = useRef(new Set<string>());
  const states = useRef(new Map<string, NetState>());
  const meshes = useRef(new Map<string, THREE.Group>());
  const acc = useRef(0);
  const last = useRef({ x: 0, y: 0, z: 0, ry: 0, at: -1 });

  const channelRef = useGameChannel(roomCode, name, {
    onRoster: (list) => {
      roster.current = new Set(list.map((p) => p.id));
      roster.current.delete(playerId);
      for (const id of [...states.current.keys()])
        if (!roster.current.has(id)) states.current.delete(id);
      setIds([...roster.current]);
    },
    onState: (s) => {
      if (roster.current.has(s.id)) states.current.set(s.id, s);
    },
  });

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);

    // Interpolate remotes toward their latest state, every frame
    const t = 1 - Math.exp(-12 * delta); // frame-rate-independent damping
    for (const [id, s] of states.current) {
      const g = meshes.current.get(id);
      if (!g) continue;
      g.visible = true; // stays hidden until its first state packet
      tmpTarget.set(s.x, s.y, s.z);
      if (g.position.distanceTo(tmpTarget) > 5) g.position.copy(tmpTarget); // teleport → snap
      else g.position.lerp(tmpTarget, t);
      const dy = s.ry - g.rotation.y;
      g.rotation.y += Math.atan2(Math.sin(dy), Math.cos(dy)) * t; // shortest arc
    }

    // Send own state at the net tick — quantized, on change, with keepalive
    acc.current += delta;
    if (acc.current < NET_TICK) return;
    acc.current = 0;
    const mesh = playerRef.current;
    const channel = channelRef.current;
    if (!mesh || !channel || document.hidden) return;

    const x = Math.round(mesh.position.x * 100) / 100;
    const y = Math.round(mesh.position.y * 100) / 100;
    const z = Math.round(mesh.position.z * 100) / 100;
    const ry = Math.round(mesh.rotation.y * 100) / 100;

    const l = last.current;
    const moved =
      Math.abs(x - l.x) + Math.abs(y - l.y) + Math.abs(z - l.z) + Math.abs(ry - l.ry) > 0.01;
    const stale = clock.elapsedTime - l.at > 1; // keepalive for late joiners
    if (!moved && !stale) return;

    last.current = { x, y, z, ry, at: clock.elapsedTime };
    channel.send({ type: "broadcast", event: "state", payload: { id: playerId, name, x, y, z, ry } });
  });

  return ids.map((id) => (
    <group
      key={id}
      visible={false}
      ref={(g) => { g ? meshes.current.set(id, g) : meshes.current.delete(id); }}
    >
      {/* same avatar as the local player — a real model per model-sourcing.md */}
    </group>
  ));
}
```

Mount it once inside the Canvas, next to the local player that owns
`playerRef`:

```tsx
<Multiplayer roomCode={room} name={name} playerRef={playerRef} />
```

A remote spawns hidden when the presence roster announces it and becomes
visible on its first state packet — within a second at worst (the keepalive),
so nobody flashes at the origin.

## Discrete Events (hits, pickups, round flow)

Movement rides the ticked `state` event; one-off events get their own
broadcast event, sent immediately (they don't wait for the tick):

```tsx
channel.send({ type: "broadcast", event: "tag", payload: { from: playerId, target: otherId } });
```

- **The acting client decides.** The shooter/tagger resolves the hit locally
  and broadcasts the outcome (favor-the-shooter). Never wait a round trip to
  confirm an action — 100 ms of "did it land?" feels broken.
- **Last write wins** on contested pickups. A rare duplicated coin beats a
  consensus protocol.
- **Each client owns its own score** and shares it in payloads. Persistent
  leaderboards go through the Cloud database (see `SKILL.md` § Scope &
  Persistence) — never trust live broadcasts for anything that persists.
- **Room coordination without an election**: when someone must own round
  start/reset, every client picks the lexicographically smallest player id in
  the presence roster as coordinator. Everyone computes the same answer, and
  succession on leave is automatic.
- **Shared objects** (a ball, a movable crate): give each one an owner — the
  last player who touched it — and only the owner broadcasts its state.
  Everything nobody touches stays deterministic scenery. Don't sync a physics
  world's every body.

## Turn-Based Games (chess, cards, word games)

Store the match in the Cloud database and subscribe to row changes — it
survives refreshes and costs one message per move instead of a stream:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
```

```tsx
useEffect(() => {
  const channel = supabase
    .channel(`games:${gameId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
      ({ new: game }) => applyRemoteMove(game),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}, [gameId]);
```

Validate moves server-side: a database function (RPC) that checks the move is
legal and it is the caller's turn, with RLS on the table — the client never
writes game state directly. Cloud knowledge covers migrations, RLS, and auth;
the game-specific part is a `state jsonb` column and the validation function.

## Latency & Feel

Broadcast round trips run ~50–150 ms in-region, worse across continents.
Design mechanics that tolerate it instead of fighting it:

- Good fits: racing (contact cosmetic or off), tag/infection with generous
  radii, co-op collection/survival, arenas where position is the gameplay,
  racing a rival's live ghost without collision.
- Bad fits: melee trades, precision shooting duels, anything where 100 ms
  decides the winner — steer to a latency-tolerant mechanic or same-screen.
- Damping `k ≈ 10–14` tracks an 8 Hz feed smoothly. If remotes rubber-band,
  lower `k` before raising the tick.
- Don't extrapolate (dead reckoning): overshoot on direction changes looks
  worse than a 100 ms trail.

## Verify With Two Clients — Never Skip

One browser proves nothing about multiplayer. Run two harness instances
(`SKILL.md` § Verify in the Browser) against the same room at the same time —
`--wait` is **milliseconds**:

```bash
code--exec sh -c 'python /tmp/verify.py --url "http://localhost:8080?room=TEST" --shot /tmp/p1.png --wait 15000 & python /tmp/verify.py --url "http://localhost:8080?room=TEST" --shot /tmp/p2.png --wait 15000; wait'
code--view /tmp/p1.png
code--view /tmp/p2.png
```

Equal `--wait` values keep both pages connected when the shots land (an
instance disconnects about a second after its shot). Each screenshot must
show the **other** player's avatar; two lonely scenes mean the channel never
connected — check the console output for the `[net] channel:` status line
(`CHANNEL_ERROR` or `TIMED_OUT` instead of `SUBSCRIBED` means Cloud isn't
enabled or the channel setup is wrong) before touching game code.

Then verify **movement sync**, not just presence: re-run with one instance
driving and one watching, runtimes matched (runtime ≈ wait + keys × hold +
800 ms):

```bash
code--exec sh -c 'python /tmp/verify.py --url "http://localhost:8080?room=TEST" --shot /tmp/driver.png --wait 5000 --keys "ArrowUp" --hold 10000 & python /tmp/verify.py --url "http://localhost:8080?room=TEST" --shot /tmp/watcher.png --wait 15000; wait'
```

The watcher's screenshot must show the driver's avatar away from its spawn
point. If a title screen gates the scene, add the entry key/click to **both**
instances before the movement keys.
