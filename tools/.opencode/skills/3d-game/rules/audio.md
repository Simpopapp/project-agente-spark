---
name: audio
description: Web Audio synthesis for sound effects, engine sounds, chiptune music, and spatial audio.
metadata:
  tags: audio, web-audio, sound, music, chiptune
---

# Audio

Generate all sound with the Web Audio API — no audio files needed. Synthesized
effects produce retro/arcade character and work instantly.

## Audio Manager

Browsers block audio until a user gesture. Create the `AudioContext` lazily on
the first click or keypress:

```ts
class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5; // honor mute toggled before init

    this.master.connect(this.ctx.destination);
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  get context() { return this.ctx; }
  get output() { return this.master; }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : 0.5,
        this.ctx.currentTime, 0.05
      );
    }
    return this.muted;
  }
}

export const audio = new AudioManager();
```

Call `audio.init()` in the game start handler (button click or first keypress).

## Synthesized Sound Effects

### Jump

```ts
function playJump() {
  const ctx = audio.context!;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(audio.output!);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}
```

### Collect / Pickup

```ts
function playCollect() {
  const ctx = audio.context!;
  const t = ctx.currentTime;
  [523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, t + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.1);
    osc.connect(gain);
    gain.connect(audio.output!);
    osc.start(t + i * 0.06);
    osc.stop(t + i * 0.06 + 0.12);
  });
}
```

### Hit / Crash

```ts
function playHit() {
  const ctx = audio.context!;
  const bufferSize = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 800;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audio.output!);
  noise.start();
  noise.stop(ctx.currentTime + 0.25);
}
```

### Explosion

```ts
function playExplosion() {
  const ctx = audio.context!;
  const t = ctx.currentTime;
  // Low boom
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(100, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.6, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc.connect(gain);
  gain.connect(audio.output!);
  osc.start(t);
  osc.stop(t + 0.5);
  // Noise layer
  playHit();
}
```

## Engine / Motor Sound

Map oscillator frequency to speed — the pitch rises as the player accelerates:

```ts
let engineOsc: OscillatorNode | null = null;
let engineGain: GainNode | null = null;

function startEngine() {
  const ctx = audio.context!;
  engineOsc = ctx.createOscillator();
  engineOsc.type = "sawtooth";
  engineOsc.frequency.value = 55;
  engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 600;
  engineOsc.connect(filter);
  filter.connect(engineGain);
  engineGain.connect(audio.output!);
  engineOsc.start();
}

function updateEngine(speed: number, throttle: boolean) {
  if (!engineOsc || !engineGain || !audio.context) return;
  const t = audio.context.currentTime;
  const freq = 50 + speed * 4;
  engineOsc.frequency.setTargetAtTime(freq, t, 0.06);
  const vol = 0.02 + (throttle ? 0.04 : 0.01) + speed * 0.001;
  engineGain.gain.setTargetAtTime(vol, t, 0.1);
}

function stopEngine() {
  if (engineOsc && engineGain && audio.context) {
    const t = audio.context.currentTime;
    engineGain.gain.setTargetAtTime(0, t, 0.1); // ramp out; a hard stop clicks
    engineOsc.stop(t + 0.3);
  }
  engineOsc = engineGain = null; // OscillatorNode is single-use — startEngine() to resume
}
```

Call `stopEngine()` on pause and game-over (and ramp `engineGain` to 0 in a
pause-without-teardown). Browsers also suspend the `AudioContext` when the tab
is hidden — resume it on visibility change so audio doesn't stay dead after a
tab switch:

```ts
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) audio.context?.resume();
});
```

Call `updateEngine(currentSpeed, isThrottling)` from `useFrame`.

## Simple Chiptune

Sequence notes using scheduled oscillator start/stop times:

```ts
function mtof(midi: number) { return 440 * Math.pow(2, (midi - 69) / 12); }

const melody = [72, 0, 76, 0, 79, 0, 76, 0, 72, 0, 0, 0, 74, 0, 72, 0];

function scheduleMelody(bpm = 140) {
  const ctx = audio.context!;
  const step = 60 / bpm / 4;
  let t = ctx.currentTime + 0.1;

  melody.forEach((note) => {
    if (note > 0) {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = mtof(note);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + step * 0.9);
      osc.connect(gain);
      gain.connect(audio.output!);
      osc.start(t);
      osc.stop(t + step);
    }
    t += step;
  });
}
```

For continuous music, don't schedule the whole track at once — use a
look-ahead scheduler: a `setInterval` (~25 ms) that schedules any notes due in
the next ~100 ms with `osc.start(t)` at absolute `ctx.currentTime`-based times,
advancing a running cursor. This keeps timing sample-accurate without flooding
the audio graph or drifting on the JS timer.

## Mute Toggle in HUD

```tsx
function MuteButton() {
  const [muted, setMuted] = useState(false);
  return (
    <button
      className="pointer-events-auto"
      onClick={() => setMuted(audio.toggleMute())}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
```
