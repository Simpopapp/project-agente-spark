---
name: hud-overlay
description: DOM overlay for game HUD, menus, sharing state between 3D scene and React UI, and localStorage high scores.
metadata:
  tags: hud, overlay, menu, ui, zustand, localstorage, high-score
---

# HUD & Menus

Layer regular React components over the Three.js canvas. Simpler, more
accessible, and more performant than rendering text in WebGL.

## DOM Overlay Pattern

```tsx
function GameCanvas() {
  return (
    <div className="fixed inset-0">
      <Canvas shadows>
        {/* 3D scene */}
      </Canvas>
      <HUD />
      <PauseMenu />
      <GameOverScreen />
    </div>
  );
}
```

The overlay container uses `pointer-events-none` so clicks pass through to
the canvas. Individual interactive elements opt back in:

```tsx
function HUD() {
  const score = useGameStore((s) => s.score);
  const timeLeft = useGameStore((s) => s.timeLeft);
  const [muted, setMuted] = useState(false);

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* Score — top left */}
      <div className="absolute top-4 left-4 text-white font-mono">
        <div className="text-sm opacity-70">SCORE</div>
        <div className="text-3xl font-bold">{Math.floor(score).toLocaleString()}</div>
      </div>

      {/* Timer — top right */}
      <div className="absolute top-4 right-4 text-white font-mono text-right">
        <div className="text-sm opacity-70">TIME</div>
        <div className={`text-3xl font-bold ${timeLeft < 10 ? "text-red-400 animate-pulse" : ""}`}>
          {Math.ceil(Math.max(0, timeLeft))}
        </div>
      </div>

      {/* Mute — pointer-events-auto so it's clickable; state so the icon updates */}
      <button
        className="absolute bottom-4 right-4 pointer-events-auto text-white/60 hover:text-white text-2xl"
        onClick={() => setMuted(audio.toggleMute())}
      >
        {muted ? "🔇" : "🔊"}
      </button>
    </div>
  );
}
```

## Menu Screens

Full-screen overlays for title, pause, and game over. These block clicks to
the canvas:

When the 3D scene is already rendering behind the overlay — a first-person
"click to enter" pointer-lock gate, or a pause screen — keep the scrim light
(`bg-black/30` or less) or use a centered card, so the lit world stays visible.
A `bg-black/60`+ full-screen cover over live gameplay reads as a black screen
(to a player on first paint, and to the verify-loop screenshot). A pre-game
title with no scene yet behind it can be as dark as you like.

```tsx
function TitleScreen() {
  const state = useGameStore((s) => s.state);
  const start = useGameStore((s) => s.start);

  if (state !== "menu") return null;

  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-center bg-black/60">
      <h1 className="text-6xl font-bold text-white mb-4">GAME TITLE</h1>
      <p className="text-white/60 mb-8">WASD to move — collect all items</p>
      <button
        className="px-8 py-4 bg-white text-black font-bold text-xl rounded-lg hover:bg-white/90"
        onClick={() => {
          audio.init();
          start();
        }}
      >
        START GAME
      </button>
    </div>
  );
}
```

```tsx
function GameOverScreen() {
  const state = useGameStore((s) => s.state);
  const score = useGameStore((s) => s.score);
  const reset = useGameStore((s) => s.reset);

  if (state !== "gameover") return null;

  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-center bg-black/70">
      <h2 className="text-4xl font-bold text-red-400 mb-4">GAME OVER</h2>
      <p className="text-white text-2xl mb-8">Score: {Math.floor(score).toLocaleString()}</p>
      <button
        className="px-6 py-3 bg-white text-black font-bold rounded-lg"
        onClick={reset}
      >
        PLAY AGAIN
      </button>
    </div>
  );
}
```

## Pause Menu

Wire Escape key to toggle pause:

```tsx
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.code === "Escape") {
      const { state, pause, resume } = useGameStore.getState();
      if (state === "playing") pause();
      else if (state === "paused") resume();
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);
```

## Sharing State: 3D ↔ HUD

Use **Zustand** as the bridge:

- **3D scene** (inside `useFrame`): read/write with `useGameStore.getState()`
  — this does not trigger React re-renders
- **HUD components**: read with `useGameStore((s) => s.field)` — this
  subscribes to changes and re-renders

This separation is critical: `useFrame` runs 60×/sec and must not trigger
React renders. Zustand's `getState()` is a plain read with zero overhead.

## In-World UI with drei Html

For health bars above characters or floating labels:

```tsx
import { Html } from "@react-three/drei";

function Enemy({ position, health }: { position: [number, number, number]; health: number }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[1, 2, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>
      <Html position={[0, 2.5, 0]} center distanceFactor={10}>
        <div className="bg-black/50 rounded-full px-2 py-0.5 text-xs text-white whitespace-nowrap">
          HP: {health}
        </div>
      </Html>
    </group>
  );
}
```

`distanceFactor` scales the HTML with distance. Use sparingly — many `<Html>`
elements hurt performance.

## High Scores (localStorage)

Persist the best score locally. Read once at store creation, write when
beaten (the `typeof window` guard keeps this SSR-safe on the Default stack):

```tsx
const HIGH_SCORE_KEY = "highScore";

function loadHighScore() {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(HIGH_SCORE_KEY) ?? 0);
}

export const useGameStore = create<GameStore>((set) => ({
  // ...existing fields
  highScore: loadHighScore(),
  gameOver: () =>
    set((s) => {
      const highScore = Math.max(s.highScore, s.score);
      localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
      return { state: "gameover", highScore };
    }),
}));
```

Show it on the game-over screen next to the run's score
(`Best: {highScore}` — and call out a new record when `score === highScore`).

localStorage is per-browser and per-device. Shared leaderboards, accounts, or
cross-device saves need a backend (Lovable Cloud) — that's beyond this skill;
tell the user so instead of faking it with local data.

## Health Bar

```tsx
function HealthBar({ current, max }: { current: number; max: number }) {
  const pct = (current / max) * 100;
  return (
    <div className="absolute bottom-4 left-4 w-48">
      <div className="text-white/70 text-xs mb-1 font-mono">HEALTH</div>
      <div className="h-3 bg-white/20 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct > 50 ? "bg-green-400" : pct > 25 ? "bg-yellow-400" : "bg-red-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```
