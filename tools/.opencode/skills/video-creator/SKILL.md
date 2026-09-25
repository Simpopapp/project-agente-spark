---
name: video-creator
description:
  "Create agency-quality animated videos programmatically using Remotion
  (React-based video framework). Renders to MP4 via code--exec CLI in the
  sandbox. Use when the user wants to create a video, animation, motion
  graphics, explainer, promo, or any animated visual content. Triggers on
  requests like 'create a video', 'make an animation', 'motion graphics',
  'explainer video', 'promo video', 'animated intro', or 'render a video'."
---

# Remotion Video — Agency-Quality Motion Graphics in Code

Your goal is to direct and execute a visually stunning motion piece that rivals
output from a top-tier motion design studio — built entirely with Remotion,
React, and Tailwind CSS. Prioritize impact, rhythm, and visual surprise over
code structure. Your work should feel "crafted," not "assembled."

**This is a VIDEO, not a website.** It renders to MP4 via Remotion's CLI
renderer (`bunx remotion render`), executed through `code--exec`. Zero
interactivity. No browser preview. No Remotion Studio. Scaffold, code, and
render through CLI tools in the sandbox. The final output
is an MP4 file.

## Sandbox Constraints

- **Rendering timeout**: `code--exec` has a max timeout of 600 seconds (10
  minutes). Keep videos under 30 seconds to stay well within limits.
- **Output location**: Save standalone deliverables to `/mnt/documents/` (Files). For outputs the app displays or serves, generate under `/tmp/`, add them only as project assets with `lovable-assets`, and use them in the app. Add a Files copy only if the user asks for one. Follow an explicit destination. The render examples below show
  standalone delivery.
- **No browser preview**: Never run `bunx remotion studio` or
  `bunx remotion preview`. All rendering is headless via CLI.
- **Use `bun install`** (the sandbox package manager). Bun installs both musl
  and gnu compositor variants automatically. After install, overwrite the gnu
  compositor's `remotion` binary with the musl one — the bundled glibc binary
  doesn't run on NixOS (see setup steps below).
- **ffmpeg and ffprobe are pre-installed** in PATH. Do NOT download or install
  ffmpeg — just use `$(which ffmpeg)` and `$(which ffprobe)`. Symlink them into
  the compositor gnu directory so remotion's renderer can find them (see setup
  steps below).
- Generate temporary source images under `/tmp/` and copy them into the video project.
- **No `backdropFilter`**: The sandbox Chromium has no GPU acceleration.
  `backdropFilter: 'blur(...)'` is extremely expensive and causes page crashes
  during render. Use `filter: 'blur(...)'` sparingly on a few elements instead.

---

## Remotion best-practices (upstream)

### Captions

When dealing with captions or subtitles, load
`knowledge://skill/video-creator/rules/subtitles.md`.

### Using FFmpeg

For operations such as trimming videos or detecting silence, load
`knowledge://skill/video-creator/rules/ffmpeg.md`.

### Audio visualization

When visualizing audio (spectrum bars, waveforms, bass-reactive effects), load
`knowledge://skill/video-creator/rules/audio-visualization.md`.

### Sound effects

Load `knowledge://skill/video-creator/rules/sfx.md` (upstream index may say
`knowledge://skill/video-creator/rules/sound-effects.md`; same content).

### Rule index

Read individual rule files with `code--view` for explanations and code examples:

- `knowledge://skill/video-creator/rules/3d.md` — 3D content with Three.js and
  React Three Fiber
- `knowledge://skill/video-creator/rules/animations.md` — Fundamental animation
  skills
- `knowledge://skill/video-creator/rules/assets.md` — Importing images, videos,
  audio, and fonts
- `knowledge://skill/video-creator/rules/audio.md` — Audio: import, trim,
  volume, speed, pitch
- `knowledge://skill/video-creator/rules/calculate-metadata.md` — Dynamic
  composition duration, dimensions, props
- `knowledge://skill/video-creator/rules/can-decode.md` — Check if a video can
  be decoded (Mediabunny)
- `knowledge://skill/video-creator/rules/charts.md` — Charts and data
  visualization
- `knowledge://skill/video-creator/rules/compositions.md` — Compositions,
  stills, folders, default props, dynamic metadata
- `knowledge://skill/video-creator/rules/extract-frames.md` — Extract frames at
  timestamps (Mediabunny)
- `knowledge://skill/video-creator/rules/fonts.md` — Google Fonts and local
  fonts
- `knowledge://skill/video-creator/rules/get-audio-duration.md` — Audio
  duration in seconds (Mediabunny)
- `knowledge://skill/video-creator/rules/get-video-dimensions.md` — Video
  width/height (Mediabunny)
- `knowledge://skill/video-creator/rules/get-video-duration.md` — Video
  duration in seconds (Mediabunny)
- `knowledge://skill/video-creator/rules/gifs.md` — GIFs synchronized with the
  timeline
- `knowledge://skill/video-creator/rules/images.md` — `Img` component
- `knowledge://skill/video-creator/rules/light-leaks.md` —
  `@remotion/light-leaks`
- `knowledge://skill/video-creator/rules/lottie.md` — Lottie animations
- `knowledge://skill/video-creator/rules/measuring-dom-nodes.md` — Measuring
  DOM dimensions
- `knowledge://skill/video-creator/rules/measuring-text.md` — Text dimensions,
  fitting, overflow
- `knowledge://skill/video-creator/rules/sequencing.md` — Delay, trim, limit
  duration
- `knowledge://skill/video-creator/rules/tailwind.md` — TailwindCSS in Remotion
- `knowledge://skill/video-creator/rules/text-animations.md` — Typography and
  text animation patterns
- `knowledge://skill/video-creator/rules/timing.md` — Interpolation curves,
  springs
- `knowledge://skill/video-creator/rules/transitions.md` — Scene transitions
- `knowledge://skill/video-creator/rules/transparent-videos.md` — Transparency
  in output
- `knowledge://skill/video-creator/rules/trimming.md` — Trim start/end of
  animations
- `knowledge://skill/video-creator/rules/videos.md` — Video embedding: trim,
  volume, speed, loop, pitch
- `knowledge://skill/video-creator/rules/parameters.md` — Parametric video with
  Zod
- `knowledge://skill/video-creator/rules/maps.md` — Mapbox maps and animation
- `knowledge://skill/video-creator/rules/voiceover.md` — ElevenLabs TTS
  voiceover
- `knowledge://skill/video-creator/rules/assets/charts-bar-chart.tsx`,
  `knowledge://skill/video-creator/rules/assets/text-animations-typewriter.tsx`,
  `knowledge://skill/video-creator/rules/assets/text-animations-word-highlight.tsx`
  — example snippets (copy with `code--exec` `cp` from the `/tmp/knowledge/skill/` mirror before execution)

**Caption pipeline (supporting files):**
`knowledge://skill/video-creator/rules/display-captions.md`,
`knowledge://skill/video-creator/rules/import-srt-captions.md`,
`knowledge://skill/video-creator/rules/transcribe-captions.md` (linked from
`knowledge://skill/video-creator/rules/subtitles.md`).

---

## Remotion Fundamentals

**All animation is frame-based.** Unlike browser animations (Framer Motion, CSS
transitions), Remotion renders each frame independently. This means:

- **All motion MUST use `useCurrentFrame()` + `interpolate()` or `spring()`** —
  never CSS transitions, CSS animations, Tailwind `animate-*` classes,
  `setTimeout`, or `requestAnimationFrame`
- **Every frame must be deterministic** — given the same frame number, the
  output must be identical
- **No `useState` for animation state** — derive everything from the frame
  number

### Core API

```tsx
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Series,
  AbsoluteFill,
} from "remotion";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";

// Frame-based animation
const frame = useCurrentFrame();
const { fps, width, height, durationInFrames } = useVideoConfig();

// Linear interpolation (with clamping)
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateRight: "clamp",
});

// Spring physics (returns 0 to 1)
const scale = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });

// With delay
const delayed = spring({ frame: frame - 15, fps, config: { damping: 15 } });

// Map spring to custom range
const x = interpolate(springValue, [0, 1], [-200, 0]);
```

### Composition Structure

```tsx
// src/Root.tsx — register your composition
import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={450} // 15 seconds at 30fps
    fps={30}
    width={1920}
    height={1080}
  />
);
```

### Sequencing Scenes

```tsx
// Option 1: <Sequence> for manual placement
<Sequence from={0} durationInFrames={90}>
  <Scene1 />
</Sequence>
<Sequence from={90} durationInFrames={120}>
  <Scene2 />
</Sequence>

// Option 2: <Series> for back-to-back scenes
<Series>
  <Series.Sequence durationInFrames={90}><Scene1 /></Series.Sequence>
  <Series.Sequence durationInFrames={120}><Scene2 /></Series.Sequence>
</Series>

// Option 3: <TransitionSeries> for overlapping transitions
<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={90}><Scene1 /></TransitionSeries.Sequence>
  <TransitionSeries.Transition
    presentation={wipe({ direction: 'from-left' })}
    timing={springTiming({ config: { damping: 200 }, durationInFrames: 30 })}
  />
  <TransitionSeries.Sequence durationInFrames={120}><Scene2 /></TransitionSeries.Sequence>
</TransitionSeries>
```

**Important:** Inside a `<Sequence>`, `useCurrentFrame()` returns frames
relative to that sequence's start (beginning at 0). This lets you build
self-contained scene components.

**Note:** Transitions overlap scenes and reduce total duration. Two 90-frame
sequences with a 30-frame transition = 150 frames total, not 180. Account for
this in your `<Composition>` durationInFrames.

### Fonts

The sandbox has system fonts pre-installed via fontconfig (Liberation
Sans/Serif/Mono, Noto Sans/Serif). CSS generic families (`sans-serif`, `serif`,
`monospace`) and common names (`Arial`, `Times New Roman`, `Courier New`)
resolve via metric aliases. Run `fc-list` to see all available fonts.

For fonts not in the system set, download TTF files and load via
`@remotion/fonts`:

```tsx
import { loadFont } from "@remotion/google-fonts/TitanOne";

const { fontFamily } = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

export const GoogleFontsComp: React.FC = () => {
  return <div style={{ fontFamily }}>Hello, Google Fonts</div>;
};
```

### Assets

```tsx
import { staticFile, Img, Video, Audio } from 'remotion';

// Static files from public/ directory
<Img src={staticFile('images/hero.png')} />
<Video src={staticFile('video/bg.mp4')} />
<Audio src={staticFile('audio/track.mp3')} />
```

### Tailwind CSS

Use Tailwind for layout and static styling. **Never use `transition-*`,
`animate-*`, or `duration-*` Tailwind classes** — they rely on CSS animations
which don't work in Remotion's renderer. All motion must come from
`interpolate()` or `spring()`.

### Spring Presets

- Smooth (no bounce): `{ damping: 200 }`
- Snappy (minimal bounce): `{ damping: 20, stiffness: 200 }`
- Bouncy: `{ damping: 8 }`
- Heavy with slight bounce: `{ damping: 15, stiffness: 80, mass: 2 }`

---

## Creative Direction

<no_interactivity> This is a video. The viewer watches — they do not click,
hover, or interact.

- No CTA buttons ("Get started", "Learn more", "Sign up")
- No navigation elements
- No interactive form elements
- Renders from frame 0 to the last frame. Zero user interaction.
  </no_interactivity>

<before_you_start> IMPORTANT! Before writing any code, establish your creative
direction:

1. **Brand research**: For real companies, search for their official brand
   guidelines, colors, fonts, and visual identity. Use their real palette and
   typography — don't guess. If guidelines aren't available, base your palette
   on the company's website and note that colors are inferred.
2. **Color palette**: Pick a bold, intentional palette. State exact hex codes. 1
   primary, 1 accent, 1-2 neutrals, and a background tone. The palette should
   have a clear vibe — editorial, playful, luxurious, energetic. Every color
   should feel deliberate. Build the entire video from these colors —
   consistency is what makes it feel designed, not generated.
3. **Typography**: Pick ONE display font + ONE body font. Max 2 fonts. Prefer
   `@remotion/google-fonts/<Name>` for anything on Google Fonts; otherwise
   bundle TTFs and load via `@remotion/fonts`. Analyze the emotional goal:
4. **Motion direction**: Pick a specific aesthetic and commit. The direction
   dictates everything — how elements enter, how scenes transition, how fast
   things move, what the whole video _feels_ like:
   - **Cinematic Minimal** — slow reveals, massive type, black + one accent,
     lots of negative space, editorial pacing
   - **Kinetic Energy** — fast cuts, bold color, rapid stagger animations, high
     contrast, energetic springs
   - **Luxury/Editorial** — refined serifs, smooth ease curves, muted tones,
     subtle parallax, gold/cream accents
   - **Tech Product** — clean geometric sans, crisp snappy transitions, dark UI
     aesthetic, code-inspired grid layouts
   - **Playful/Pop** — rounded fonts, bouncy springs, saturated colors, shape
     morphs, playful character animation
   - **Abstract/Atmospheric** — particle systems, generative shapes, slow
     drifting motion, ambient textures, ethereal These are starting points —
     invent your own if the content calls for something different. The point is
     to have a nameable aesthetic, not a vague "clean and modern."
5. **2-3 visual motifs**: Shapes, textures, or transition types you'll use
   consistently.
6. **Editor Guidelines**: Write 3 bullets describing the vibe/mood, camera
   movement style, and emotional arc.
7. **Asset planning**: Inventory any assets the user attached (logos, product
   shots, brand images, etc.) and decide where each one appears. Then plan what
   additional images or textures you need.

Commit to a direction and execute. Don't overthink. </before_you_start>

<motion_system> Before coding, define your motion system. This is what separates
a coherent video from a bag of random transitions:

- **How do elements enter?** Spring-in? Blur-to-sharp? Clip-path reveal?
  Scale-up? Pick one default entrance and stick with it.
- **How do they exit?** The exit should feel like the natural inverse of the
  entrance.
- **What's the default easing?** One curve for most motion. Save springs for
  accent moments.
- **What's the accent motion?** For hero moments (title reveals, key stats,
  product shots), use a more dramatic version — bigger scale, longer duration,
  more overshoot.
- **What's the scene transition style?** Pick 1-2 from `@remotion/transitions`
  and reuse them. Consistency reads as intentional.

Define these once, apply everywhere. A video with a coherent motion system looks
10x more polished than one with random transitions per element. </motion_system>

## Visual Style

**Avoid:**

- Neon colors, purple gradients, cyan/magenta palettes (unless requested)
- Generic dark mode with glowing elements
- Same spring config on everything
- Random transitions (every cut uses a different trick)
- Fading to black between scenes
- More than 2 fonts

**Pursue:**

- Cohesive art direction — pick a look and commit
- Intentional color palette (bold, muted, warm, cool — but consistent)
- Mixed media when appropriate (photos, textures, generated imagery)
- Restraint — a few strong ideas executed well
- Seamless transitions — scenes flow directly into each other

**Specific constraints:**

- Never use the same animation duration for every element — vary between 5 and
  45 frames
- Never center every scene — use asymmetric layouts, off-center type,
  edge-aligned elements
- Never use plain white or plain black as a scene background — at minimum a
  subtle gradient
- Always vary scene durations — mix 60-frame punchy beats with 150-frame
  dramatic moments

## Quality Tests

Your video should pass these:

- **Mute test**: Can you follow the story visually with no sound?
- **Squint test**: Can you still see the hierarchy?
- **Timing test**: Do movements feel natural (no robotic linear slides)?
- **Consistency test**: Do similar elements behave similarly?
- **Slideshow test**: Does this look nothing like a slideshow?
- **Frame spot-check**: Render stills at key frames
  (`code--exec bunx remotion still`) — does every frame look intentional?

---

## Be Extremely Creative

Push boundaries:

- Unexpected transitions (a shape zooms across screen, morphs into the next
  scene)
- Dynamic camera-like movements (parallax, zooms, pans via transform)
- Visual metaphors that surprise
- Moments of visual drama (quick cuts, slow reveals, contrast)
- Rhythm and pacing that feels edited, not programmatic
- Per-character kinetic typography with perspective and scale variation
- Layered parallax with foreground/midground/background at different speeds
- SVG path animations with `strokeDashoffset` tracing driven by `interpolate()`

---

## Project Setup and Rendering

### Remotion Work Directory

Build under `/tmp/remotion/`. To keep editable source, substitute its chosen
absolute directory in every command below. Each exec call starts a new shell;
include `cd` in every call that operates on the Remotion project.

### Setup in Sandbox

```bash
# Create the project directory and initialize
code--exec mkdir -p /tmp/remotion && cd /tmp/remotion && bun init -y

# Install Remotion and dependencies — bun installs both musl and gnu compositor variants automatically
code--exec cd /tmp/remotion && bun install remotion @remotion/cli @remotion/player @remotion/renderer @remotion/bundler @remotion/compositor-linux-x64-musl @remotion/transitions @remotion/google-fonts @remotion/fonts react react-dom typescript @types/react

# Fix compositor binary — remotion detects glibc and loads the gnu variant, but its bundled
# glibc binary doesn't run on NixOS. Overwrite with the working musl binary.
# ffmpeg is already in PATH — do NOT use nix to download it
code--exec cd /tmp/remotion && mkdir -p node_modules/@remotion/compositor-linux-x64-gnu && cp node_modules/@remotion/compositor-linux-x64-musl/remotion node_modules/@remotion/compositor-linux-x64-gnu/remotion && chmod +x node_modules/@remotion/compositor-linux-x64-gnu/remotion && ln -sf "$(which ffmpeg)" node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg && ln -sf "$(which ffprobe)" node_modules/@remotion/compositor-linux-x64-gnu/ffprobe
```

### File Structure

```
/tmp/remotion/
  tsconfig.json           # TypeScript config (jsx: "react-jsx", module: "preserve")
  src/
    index.ts              # Entry point: registerRoot(RemotionRoot)
    Root.tsx              # Composition registration
    MainVideo.tsx         # Main component with persistent layers + TransitionSeries
    scenes/
      Scene1.tsx          # Individual scene components
      Scene2.tsx
      Scene3.tsx
      Scene4.tsx
      Scene5.tsx
    components/
      PersistentBackground.tsx
      PersistentAccents.tsx
  public/
    images/               # Static assets (user-attached images go here)
    fonts/                # Local fonts (if not using Google Fonts)
```

**Required `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Preserve",
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

**Required `src/index.ts`:**

```ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
```

### Rendering to MP4

**Primary method — programmatic render script** (recommended for sandbox
reliability):

Create `/tmp/remotion/scripts/render-remotion.mjs`:

```js
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  selectComposition,
  openBrowser,
} from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => config,
});

const browser = await openBrowser("chrome", {
  browserExecutable:
    process.env.PUPPETEER_EXECUTABLE_PATH ??
    "/bin/chromium",
  chromiumOptions: {
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({
  serveUrl: bundled,
  id: "main",
  puppeteerInstance: browser,
});

await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: "/mnt/documents/output.mp4",
  puppeteerInstance: browser,
  concurrency: 1,
});

await browser.close({ silent: false });
```

Then render:

```bash
code--exec cd /tmp/remotion && node scripts/render-remotion.mjs
```

**Critical sandbox rules for the render script:**

- `chromeMode: "chrome-for-testing"` — required for the sandbox's Nix Chromium;
  the default mode will fail
- Omit `muted` to preserve audio. The sandbox ffmpeg includes `libfdk_aac`;
  use `muted: true` only when silent output is intended.
- `browser.close({ silent: false })` — must pass an object argument, not just
  `browser.close()`
- Keep the render script inside the chosen Remotion work directory.

**Alternative — CLI render** (simpler but less control):

```bash
# Render to MP4
code--exec cd /tmp/remotion && bunx remotion render src/index.ts main /mnt/documents/video.mp4

# Render specific frame range (useful for debugging a scene)
code--exec cd /tmp/remotion && bunx remotion render src/index.ts main /mnt/documents/video.mp4 --frames=0-90

# Render a single frame as image (quick visual check)
code--exec cd /tmp/remotion && bunx remotion still src/index.ts main /tmp/frame-check.png --frame=45

# Render with specific codec/quality
code--exec cd /tmp/remotion && bunx remotion render src/index.ts main /mnt/documents/video.mp4 --codec=h264 --crf=18

# Render with concurrency (faster on multi-core)
code--exec cd /tmp/remotion && bunx remotion render src/index.ts main /mnt/documents/video.mp4 --concurrency=4
```

**Note:** When scaffolding manually (not via `create-video`), you must pass the
entry file (`src/index.ts`) as the first argument to `bunx remotion render`.

### Debugging

- If render fails, read the CLI error output from `code--exec`
- **"Page crashed!"** — reduce concurrency to 1, remove any `backdropFilter`
  usage, reduce blur effects
- **No visible text in rendered video** — fonts did not load. Confirm `loadFont`
  from `@remotion/google-fonts/<Font>` or `@remotion/fonts` runs at module
  scope, Remotion is ≥ v3.2.40 for Google Fonts CDN, and you are not relying on
  bare `system-ui` / `sans-serif` alone
- Common issues: missing deps, import errors, invalid frame math
- Render a subset of frames to isolate which scene has the bug: `--frames=0-90`,
  `--frames=90-210`, etc.
- Use `code--exec cd /tmp/remotion && bunx remotion still src/index.ts main /tmp/debug.png --frame=N` to check
  a specific frame visually without rendering the full video
- Use `code--view /tmp/debug.png` to inspect the rendered frame

---

## Implementation Steps

1. **Create a strong vision for the video** — write the vibe, camera movement
   style, and emotional arc
2. **Establish visual direction** — colors, fonts, brand feel, animation style,
   motifs
3. **Plan assets** — inventory user-attached assets, plan supplemental images
4. **Set up the project** — create directory, `bun init`, install Remotion deps,
   configure `<Composition>` with 1920x1080/30fps/duration
5. **Load fonts** — use `@remotion/google-fonts/<FontName>` at module scope for
   Google Fonts (Remotion ≥ v3.2.40); for custom typefaces, add TTFs under
   `public/fonts/` and `loadFont` from `@remotion/fonts`
6. **Build persistent layers first** — animated gradients, floating shapes,
   drifting accents. These span the full video duration outside scene sequences.
7. **Build 5 scenes**, each in its own file — each is a choreographed sequence
   with 3-5 staggered elements and frame-based delays. Plan background,
   midground, and foreground layers per scene.
8. **Wire scenes together** — use `<TransitionSeries>` with transitions between
   scenes. Calculate total durationInFrames accounting for transition overlaps.
9. **Open with a hook** — the first scene should grab attention immediately
10. **Close with a strong ending** — intentional and resolved, not abrupt
11. **Spot-check key frames** —
    `code--exec cd /tmp/remotion && bunx remotion still main /tmp/check.png --frame=N` to verify
    critical moments
12. **Render to MP4** at the destination chosen above.
13. **Verify output**: confirm the standalone file exists in Files, or the app
    uses the video asset.

## Rules

- Zero interactivity — this is a video
- No static frames — add sinusoidal motion if text needs reading time
- Every scene should feel part of the same designed system
- All animation via `useCurrentFrame()` + `interpolate()`/`spring()` — NEVER CSS
  transitions, Framer Motion, or setTimeout
- Use `<AbsoluteFill>` as the root layout for each scene
- Use `<TransitionSeries>` for scene sequencing with transitions
- Use `<Sequence>` for intra-scene timing and staggering
- Each scene in its own file under `src/scenes/`
- Static assets in `public/`, referenced via `staticFile()`
- Google Fonts: `@remotion/google-fonts/<FontName>` at module scope (Remotion ≥
  v3.2.40); custom faces: `@remotion/fonts` + TTF in `public/fonts/`
- Never open Remotion Studio or browser preview — all rendering via `code--exec`
- Prefer the programmatic render script (`scripts/render-remotion.mjs`) over
  `bunx remotion render` for reliable sandbox rendering
- All animations via `useCurrentFrame()` + `interpolate()`/`spring()` — no CSS
  animations, no Framer Motion
- Use `bunx remotion still` for quick frame checks during development
- Report the final MP4 path and file size to the user when done
