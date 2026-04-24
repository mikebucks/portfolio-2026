# portfolio-2026

A fast, polished design-engineering portfolio with a cinematic WebGL
background and a hidden audio-reactive synth. Next.js · React · TypeScript ·
Three.js · R3F · Drei · GSAP · Lenis · Tone.js · Tailwind v4.

## Quick start

```bash
npm install
npm run dev
```

Then visit http://localhost:3000.

## Secret synth

- Home row plays chromatic notes: `A S D F G H J K L ;`
- `Shift` = +1 octave, `Alt/Option` = −1 octave
- `Cmd/Ctrl + Shift + S` or hold `A+S+D` for ~800ms to reveal the synth panel
- Settings persist to `localStorage`

Audio is locked until the first gesture (keydown / click). Tone.js is
lazy-loaded after unlock so the static shell stays small.

## Structure

```
src/
  app/                 routes (home, /work, /work/[slug], /about)
  components/
    layout/            header, footer
    home/              hero, background, featured, synth panel
    webgl/             R3F scene + shader plane + particles
      materials/       background shader material
        shaders/       .vert / .frag
    audio/             provider, engine, keyboard mapping, controls
    animation/         lenis, gsap intro, scroll scene
  data/projects.ts     file-based content (no CMS in v1)
  lib/
    store.ts           zustand: UI + synth settings (persisted)
    visualEvents.ts    audio→visual event bus + shared state
    device.ts          capability & preference checks
    performance.ts     fps guard, visibility pause
```

## Architecture notes

**Audio → visual flow** uses musical events (note start, frequency, velocity,
envelope), not raw FFT. Events go through `visualBus` into a plain JS
`visualState` object that the R3F render loop reads each frame — no React
re-renders per frame.

**WebGL** renders one fullscreen shader plane + a very thin particle field.
DPR is clamped (1.75 desktop / 1.25 mobile), the canvas is paused when the
tab is hidden, and the whole `<Scene>` is lazily imported with `ssr: false`.

**Progressive enhancement.** WebGL is gated on feature detection; if it's
unavailable or `prefers-reduced-motion` is set, a CSS gradient renders
instead. All routes are plain HTML without requiring JS to read the content.

**Accessibility.** Skip link, visible focus ring, `Esc` to close the synth
panel, and the keyboard synth ignores form fields / contenteditable targets.

## Build phases (status)

- [x] Phase 1 — Portfolio shell (routes, data, hero, footer, header)
- [x] Phase 2 — WebGL background (shader plane, pointer uniforms, fallback)
- [x] Phase 3 — Synth engine (lazy Tone.js, home-row notes, unlock UI)
- [x] Phase 4 — Audio-reactive visuals (event bus, note→uniforms, no re-renders)
- [x] Phase 5 — Hidden synth UI (panel, ADSR, filter/effects, persistence)
- [ ] Phase 6 — Polish (case-study transitions, mobile tap zones, perf pass)

## Next steps

- Mobile tap zones / gesture instrument (currently desktop-first).
- Case study transitions (view transitions or a GSAP flip).
- Real typography pass (currently system stack).
- Replace placeholder project copy in `src/data/projects.ts`.
- Lighthouse / bundle budget check before shipping.

## Scripts

```bash
npm run dev        # next dev
npm run build      # next build
npm run start      # next start
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```
