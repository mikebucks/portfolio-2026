"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import { useThemeStore, useIntroStore } from "@/lib/store";
import {
  THEME_PRESETS,
  type ThemeId,
} from "@/components/webgl/materials/shaders/themes";

/**
 * Interactive shader surface. Two variants:
 *
 *   "full"   — full-bleed fixed background (home page). Sits behind everything
 *              at -z-10 and fills the viewport.
 *   "header" — fills its nearest positioned ancestor (a page-header banner) so
 *              subsequent pages get the shader as a header treatment.
 *
 * Page-draw sequence, to avoid a flash of the loading gradient:
 *
 *   "probing"     — initial. Show black only (the wrapper's own bg). No
 *                   gradient, no canvas. Removes the one-frame gradient flash
 *                   that would otherwise show before the probe effect runs.
 *   "loading"     — WebGL confirmed. Mount the canvas at opacity 0 over black;
 *                   gradient stays hidden while `three` and the material load.
 *   "ready"       — the shader painted its first real frame. Fade the canvas in.
 *   "unsupported" — WebGL unavailable OR setup failed. Show the CSS gradient as
 *                   the fallback. This is the only path that ever shows purple.
 *
 * `WebGLCanvas` measures its own element, so it renders correctly at either size
 * with no variant-specific code beyond the wrapper positioning below.
 */
type Status = "probing" | "loading" | "ready" | "unsupported";

export function InteractiveBackground({
  variant = "full",
}: {
  variant?: "full" | "header";
}) {
  const [status, setStatus] = useState<Status>("probing");

  useEffect(() => {
    try {
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
      setStatus(gl ? "loading" : "unsupported");
    } catch {
      setStatus("unsupported");
    }
  }, []);

  // Release the cream intro reveal once the full-bleed shader has painted its
  // first frame — or immediately on the unsupported (CSS-gradient) fallback,
  // which has nothing to wait for. Only the full background gates the intro.
  useEffect(() => {
    if (variant !== "full") return;
    if (status === "ready" || status === "unsupported") {
      useIntroStore.getState().setReady();
    }
  }, [variant, status]);

  return (
    <div
      aria-hidden="true"
      // translateZ(0) locks this as a stable GPU compositing layer from the
      // first paint. Without it, iOS Safari decides on the fly whether the
      // fixed background gets its own layer, which makes mix-blend-difference
      // on the hero text inconsistent on first load.
      style={{ transform: "translateZ(0)" }}
      className={
        variant === "full"
          ? // Top-anchored with a fixed 100lvh height (.bg-layer-full) rather
            // than inset-0: a fixed inset-0 box tracks iOS's *dynamic* viewport,
            // so its height changes all the way through the toolbar animation.
            // See the .bg-layer-full comment in globals.css.
            "pointer-events-none fixed inset-x-0 top-0 bg-layer-full -z-10 overflow-hidden bg-[#08080a]"
          : // Render at full viewport height anchored to the banner's top, so
            // the shader is the SAME scale as the home page and the banner's
            // own overflow-hidden simply crops the bottom — no squashing.
            "pointer-events-none absolute top-0 left-0 h-screen w-full z-0 overflow-hidden bg-[#08080a]"
      }
    >
      {/* CSS gradient — fallback only. Shown when WebGL is unavailable or setup
          failed, never on the normal load path (which draws black then fades in
          the shader). */}
      {status === "unsupported" && (
        <div
          className="absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse 90% 70% at 65% 45%, rgba(30,50,200,0.55), transparent 65%)",
              "radial-gradient(ellipse 70% 90% at 25% 75%, rgba(160,60,240,0.35), transparent 60%)",
              "radial-gradient(ellipse 55% 55% at 60% 15%, rgba(0,200,230,0.30), transparent 55%)",
            ].join(", "),
          }}
        />
      )}

      {/* Canvas mounts over black once WebGL is confirmed, and fades in on its
          first painted frame. On setup failure it flips us to the gradient. */}
      {(status === "loading" || status === "ready") && (
        <WebGLCanvas
          visible={status === "ready"}
          onFirstFrame={() => setStatus("ready")}
          onUnavailable={() => setStatus("unsupported")}
        />
      )}
    </div>
  );
}

function WebGLCanvas({
  visible,
  onFirstFrame,
  onUnavailable,
}: {
  visible: boolean;
  onFirstFrame: () => void;
  onUnavailable: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const themeRef = useRef<ThemeId>(theme);
  // Populated by the async setup IIFE; called on theme change to swap the
  // fragment shader on the live material.
  const swapThemeRef = useRef<((next: ThemeId) => void) | null>(null);

  // Setup effect has [] deps, so keep these callbacks in refs updated each
  // render to avoid firing stale closures from the async IIFE below.
  const onFirstFrameRef = useRef(onFirstFrame);
  const onUnavailableRef = useRef(onUnavailable);
  onFirstFrameRef.current = onFirstFrame;
  onUnavailableRef.current = onUnavailable;

  useEffect(() => {
    themeRef.current = theme;
    swapThemeRef.current?.(theme);
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Guards against StrictMode double-invoke and navigation races: an
    // abandoned mount must not flip parent status or leak a render loop.
    let cancelled = false;
    // Teardown registered asynchronously once setup completes.
    let teardown = () => {};

    (async () => {
      try {
        const [
          THREE,
          { createBackgroundMaterial, applyTheme },
          events,
          device,
          perf,
          { isBackgroundCovered },
          { WAVE_SIZE, captureWaveform, waveformShape },
        ] = await Promise.all([
          import("three"),
          import("@/components/webgl/materials/backgroundMaterial"),
          import("@/lib/visualEvents"),
          import("@/lib/device"),
          import("@/lib/performance"),
          import("@/lib/backgroundGate"),
          import("@/lib/audioScope"),
        ]);

        // Mount was abandoned while chunks downloaded — don't build anything.
        if (cancelled) return;

        // ── Renderer ─────────────────────────────────────────────────────
        const renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        });
        renderer.setClearColor(0x08080a);

        // Adaptive DPR ladder: start from the device-clamped ceiling and step
        // down toward a floor when the GPU can't hold frame rate (see the
        // adaptive-quality controller below). Weak devices (isLowPower) begin one
        // rung down so they don't have to tank a second of frames to get there.
        const baseDpr = device.getClampedDpr();
        const dprLevels = [baseDpr, baseDpr * 0.85, baseDpr * 0.7, baseDpr * 0.6];
        const lowPower = device.isLowPower();
        // Causation is a ray-marched terrain — far heavier per pixel than the flat
        // themes — so it renders at a lower DPR. Its soft grayscale hides the drop.
        // Effective DPR = adaptive quality level × this per-theme scale.
        const dprScaleForTheme = (t: ThemeId) => (t === "causation" ? 0.72 : 1);
        let qualityDpr = dprLevels[lowPower ? 1 : 0];
        let themeDprScale = dprScaleForTheme(themeRef.current);
        let currentDpr = qualityDpr * themeDprScale;
        renderer.setPixelRatio(currentDpr);

        // Measure our own element rather than the window, so the same code path
        // serves both the full-bleed background and a bounded header banner.
        // The canvas is styled `w-full h-full` by CSS, so setSize(..., false)
        // must not overwrite that with pixel styles.
        const measure = () => ({
          w: canvas.clientWidth || window.innerWidth,
          h: canvas.clientHeight || window.innerHeight,
        });

        // ── Scene ─────────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        // near=-1 keeps our z=0 plane safely inside the frustum.
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

        const material = createBackgroundMaterial(themeRef.current);
        // Keep the geometry reachable so teardown can dispose it — an inline
        // `new PlaneGeometry` would leak its GPU buffer on every remount.
        const planeGeo = new THREE.PlaneGeometry(2, 2);
        scene.add(new THREE.Mesh(planeGeo, material));

        // ── Sizing ────────────────────────────────────────────────────────
        // Resize events only RECORD a target; the drawing buffer is resized
        // inside the render loop, immediately before the draw call.
        //
        // renderer.setSize assigns canvas.width/height, and assigning either
        // reallocates and clears the WebGL drawing buffer. Doing that from an
        // event handler leaves a cleared (black) buffer that the compositor can
        // present before the next rAF paints it. iOS fires a stream of resizes
        // while its toolbars animate and defers rAF during touch scrolling, so
        // the background strobed for the whole animation. Resizing inside the
        // tick means the frame that clears the buffer is the frame that
        // repaints it.
        const isTouch = device.isCoarsePointer();
        // Far above any browser-toolbar delta (~50-120px), far below an
        // orientation change (which swaps width, so it takes the other branch).
        const CHROME_JITTER = 200;

        let pendingW = 0;
        let pendingH = 0;
        // -1 so the first applyPendingResize always sizes the buffer.
        let appliedW = -1;
        let appliedH = -1;

        // Scrollable range, cached here rather than read per scroll event.
        // Reading scrollHeight mid-scroll forces a layout flush every frame,
        // because Lenis and GSAP have already dirtied the DOM. uScroll is a
        // slow-moving 0..1 ratio, so a stale range between resizes is harmless.
        let scrollRange = 0;

        const requestResize = () => {
          scrollRange =
            document.documentElement.scrollHeight - window.innerHeight;
          const { w, h } = measure();
          // .bg-layer-full pins the full-bleed layer to 100lvh so chrome can't
          // resize it, but in-app browsers vary and lvh has been reported short
          // on some hardware. Swallow any residual chrome-sized jitter here.
          if (isTouch && w === pendingW && Math.abs(h - pendingH) < CHROME_JITTER) {
            return;
          }
          pendingW = w;
          pendingH = h;
        };

        const applyPendingResize = () => {
          if (pendingW === appliedW && pendingH === appliedH) return;
          appliedW = pendingW;
          appliedH = pendingH;
          renderer.setSize(appliedW, appliedH, false);
          // uResolution must be in physical (buffer) pixels — gl_FragCoord is
          // also physical. Logical CSS pixels would be off by devicePixelRatio.
          material.uniforms.uResolution.value.set(
            renderer.domElement.width,
            renderer.domElement.height,
          );
        };

        requestResize();
        applyPendingResize();

        // Change the render DPR and force a buffer realloc at the new ratio —
        // setPixelRatio alone doesn't resize, so clear the applied cache and
        // re-run the sizing that also refreshes uResolution.
        const applyEffectiveDpr = () => {
          const next = qualityDpr * themeDprScale;
          if (next === currentDpr) return;
          currentDpr = next;
          renderer.setPixelRatio(next);
          appliedW = -1;
          appliedH = -1;
          applyPendingResize();
        };

        const quality = perf.createAdaptiveQuality({
          dprLevels,
          startLevel: lowPower ? 1 : 0,
          onChange: (dpr) => {
            qualityDpr = dpr;
            applyEffectiveDpr();
          },
        });

        // Wire up live theme swapping. If the user changed theme during the
        // async import, sync to the latest value now.
        let activeTheme = themeRef.current;
        swapThemeRef.current = (next: ThemeId) => {
          if (next === activeTheme) return;
          applyTheme(material, next);
          activeTheme = next;
          themeDprScale = dprScaleForTheme(next);
          applyEffectiveDpr();
        };
        if (themeRef.current !== activeTheme) {
          swapThemeRef.current(themeRef.current);
        }

        // ── Particles ─────────────────────────────────────────────────────
        let particleMat: THREE.PointsMaterial | null = null;
        let particleMesh: THREE.Points | null = null;
        if (
          !device.prefersReducedMotion() &&
          !device.isCoarsePointer() &&
          !lowPower
        ) {
          const count = 500;
          const pos = new Float32Array(count * 3);
          for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 4;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 2.5;
            pos[i * 3 + 2] = 0;
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
          particleMat = new THREE.PointsMaterial({
            size: 0.007,
            color: 0xffffff,
            transparent: true,
            opacity: 0.22,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          particleMesh = new THREE.Points(geo, particleMat);
          scene.add(particleMesh);
        }

        // ── Pointer / click / scroll ──────────────────────────────────────
        let lastX = 0, lastY = 0, lastT = 0, primed = false;
        let pointerHasMoved = false;
        const {
          visualState,
          bumpPointerImpulse,
          triggerClick,
          tickVisualState,
          visualBus,
          arePointerClicksLocked,
        } = events;

        // ── Voice pool (polyphonic color) ─────────────────────────────────
        // Each note_on claims a slot; envelopes decay independently so
        // multiple simultaneous notes each contribute their own color.
        type Voice = { colorNorm: number; vel: number; env: number };
        const voices: Voice[] = Array.from({ length: 4 }, () => ({
          colorNorm: 0, vel: 0, env: 0,
        }));

        // Map a note string ("C4", "F#3", …) to 0..1 by semitone position.
        // Spreads all 12 chromatic notes evenly across the full color palette
        // so every key gets a distinct hue regardless of octave or frequency.
        const NOTE_SEMITONES: Record<string, number> = {
          C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3,
          E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8,
          Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
        };
        const noteToColorNorm = (noteStr: string) => {
          const m = noteStr.match(/^([A-G][b#]?)/);
          if (!m) return 0;
          return (NOTE_SEMITONES[m[1]] ?? 0) / 11;
        };

        const offBus = visualBus.on((e) => {
          if (e.type !== "note_on") return;
          // Find a free (silent) slot, or steal the quietest active voice.
          let target = 0;
          let lowestEnv = Infinity;
          for (let i = 0; i < voices.length; i++) {
            if (voices[i].env < 0.02) { target = i; break; }
            if (voices[i].env < lowestEnv) { lowestEnv = voices[i].env; target = i; }
          }
          // Store colorNorm at note-on time — stable for the life of the voice.
          const colorNorm = noteToColorNorm(e.note);
          voices[target] = {
            colorNorm,
            vel: e.velocity,
            env: e.velocity,
          };

          // Notes disturb the terrain the same way a click does, but placed by
          // pitch instead of by cursor: low to high runs left to right, so
          // playing up the home row walks the wavefront across the view. The
          // span covers ~70-1100Hz, which puts the unshifted row within the
          // middle half of the frame and sends the octave-shifted extremes out
          // toward the edges.
          //
          // Deliberately quieter than a deliberate click — keys fire far more
          // often, and a chord lands several at once. They share the single
          // click channel, so the newest note takes over the wavefront rather
          // than compounding with the ones still decaying.
          const pitchNorm =
            Math.log2(Math.max(e.frequency, 1) / 70) / Math.log2(1100 / 70);
          triggerClick(
            Math.max(-1, Math.min(1, pitchNorm * 2 - 1)),
            -0.1,
            0.45 * Math.max(e.velocity, 0.6),
          );
        });

        const onMove = (e: PointerEvent) => {
          const rect = canvas.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
          if (primed) {
            const now = performance.now();
            const elapsed = Math.max(1, now - lastT);
            const speed = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2) / (elapsed / 1000);
            bumpPointerImpulse(Math.min(0.12, speed * 0.015));
            lastT = now;
          } else { lastT = performance.now(); primed = true; }
          visualState.pointer[0] = x;
          visualState.pointer[1] = y;
          pointerHasMoved = true;
          lastX = x; lastY = y;
        };

        const onDown = (e: PointerEvent) => {
          // Muted while the hero headline is rolling — it fires its own pulses
          // per word, and a click on top of those stacks wavefronts.
          if (arePointerClicksLocked()) return;
          const rect = canvas.getBoundingClientRect();
          triggerClick(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -(((e.clientY - rect.top) / rect.height) * 2 - 1),
          );
        };

        const onScroll = () => {
          visualState.scroll =
            scrollRange > 0 ? window.scrollY / scrollRange : 0;
        };

        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerdown", onDown, { passive: true });
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", requestResize, { passive: true });
        // Observe the element too — banner layout can change without a window
        // resize (e.g. content reflow), and this keeps the buffer in sync.
        const resizeObserver = new ResizeObserver(requestResize);
        resizeObserver.observe(canvas);
        onScroll();

        const offVisibility = perf.onVisibilityChange((v) => { paused = !v; });

        // ── Render loop ───────────────────────────────────────────────────
        let animId = 0;
        let paused = false;
        let last = performance.now();
        // Integrated phase. Advances at 5% of the source-shader pace at rest
        // and ramps up to source-shader pace at peak click/note input.
        // Always monotonic so the noise field never reverses on input decay.
        let shaderTime = 0;
        // ── Synth waveform ───────────────────────────────────────────────
        // One cycle of the live voice, uploaded as a 256×1 texture. RGBA/byte
        // rather than a float format so it needs no extension and no WebGL2
        // fallback; 8 bits is well past what a visual displacement resolves.
        const waveData = new Uint8Array(WAVE_SIZE * 4);
        const waveTex = new THREE.DataTexture(waveData, WAVE_SIZE, 1);
        waveTex.wrapS = THREE.RepeatWrapping;
        waveTex.minFilter = THREE.LinearFilter;
        waveTex.magFilter = THREE.LinearFilter;
        material.uniforms.uWave.value = waveTex;

        const uploadWave = () => {
          const s = waveformShape();
          for (let i = 0; i < WAVE_SIZE; i++) {
            const v = Math.round((s[i] * 0.5 + 0.5) * 255);
            const b = v < 0 ? 0 : v > 255 ? 255 : v;
            const o = i * 4;
            waveData[o] = b;
            waveData[o + 1] = b;
            waveData[o + 2] = b;
            waveData[o + 3] = 255;
          }
          waveTex.needsUpdate = true;
        };
        // Seed with the resting sine so the first frame is already correct.
        uploadWave();

        // Eased copy of the pointer, fed to uPointerLag.
        const pointerLag: [number, number] = [-9, -9];
        let pointerLagPrimed = false;
        // Eased follow angle for the Vibration square, fed to uSquareRot.
        let squareRot = 0;
        // Latches on the first painted frame so we reveal the canvas once.
        let firstFramePainted = false;

        const tick = () => {
          animId = requestAnimationFrame(tick);
          // Skip the draw when the tab is hidden OR an opaque overlay (the project
          // modal) fully covers the layer — every frame under it is invisible.
          // `last` is intentionally not advanced here; the dt clamp below absorbs
          // the gap on resume, exactly as the tab-hidden pause already relies on.
          if (paused || isBackgroundCovered()) return;
          const now = performance.now();
          const dt = Math.min((now - last) / 1000, 0.05);
          last = now;

          // Sample frame rate and adapt DPR before drawing. Only reached on real
          // (non-paused, non-covered) frames, so a modal or hidden tab never
          // pollutes the average.
          quality.tick();

          // Clear-and-repaint in the same frame — see the Sizing block above.
          applyPendingResize();

          tickVisualState(dt);

          // Decay each voice envelope independently.
          for (const voice of voices) {
            voice.env = Math.max(0, voice.env - dt * 1.2);
          }

          // Integrate shaderTime at a rate driven by click + note pulse only.
          // Pointer is spatial, not a rate driver — it shouldn't jolt time.
          const reactivityScale = 0.5 + 0.5 * visualState.reactivity;
          const rawPulse =
            (0.55 * visualState.clickImpulse +
              1.0 *
                visualState.noteImpulse *
                Math.max(visualState.velocity, 0.4)) *
            reactivityScale;
          const pulse = Math.min(1, Math.max(0, rawPulse));
          const rate = 0.05 + 0.95 * pulse;
          shaderTime += dt * rate;

          // Re-capture the voice. Returns false on silence, which leaves the
          // last captured cycle in place — that retained shape is what clicks
          // and pointer motion animate when nothing is sounding.
          if (captureWaveform(visualState.frequency)) uploadWave();

          const u = material.uniforms;
          u.uTime.value += dt;
          u.uShaderTime.value = shaderTime;
          if (pointerHasMoved) {
            u.uPointer.value.set(visualState.pointer[0], visualState.pointer[1]);
            // Exponential ease toward the live pointer, frame-rate independent.
            // Snapped on the first move so it doesn't crawl in from the
            // off-screen sentinel the uniform starts at.
            if (pointerLagPrimed) {
              const k = 1 - Math.exp(-dt / 0.26);
              pointerLag[0] += (visualState.pointer[0] - pointerLag[0]) * k;
              pointerLag[1] += (visualState.pointer[1] - pointerLag[1]) * k;
            } else {
              pointerLag[0] = visualState.pointer[0];
              pointerLag[1] = visualState.pointer[1];
              pointerLagPrimed = true;
            }
            u.uPointerLag.value.set(pointerLag[0], pointerLag[1]);
          }

          // Vibration's square turns to follow the cursor within the quadrant
          // its attracted corner occupies. Crossing an axis hands off to the
          // neighbouring corner and the target angle jumps from one extreme to
          // the other; easing toward it lets the square drift into its new
          // resting angle instead of snapping. Mirrors the geometry in
          // vibration.ts — see the corner-selection block there.
          let squareRotTarget = 0;
          if (pointerHasMoved) {
            const aspect =
              u.uResolution.value.y > 0
                ? u.uResolution.value.x / u.uResolution.value.y
                : 1;
            const mx = pointerLag[0] * 0.5 * aspect;
            const my = pointerLag[1] * 0.5;
            const md = Math.hypot(mx, my);
            if (md > 1e-4) {
              // Angle from the attracted corner's rest diagonal to the cursor,
              // i.e. the cursor's angle folded into the ±45° of its quadrant.
              const residual =
                Math.atan2(my, mx) - Math.atan2(Math.sign(my), Math.sign(mx));
              // Matches the shader's smoothstep(0.0, 0.06, md) grip.
              const g = Math.min(1, Math.max(0, md / 0.06));
              squareRotTarget = residual * 0.32 * (g * g * (3 - 2 * g));
            }
          }
          squareRot +=
            (squareRotTarget - squareRot) * (1 - Math.exp(-dt / 0.32));
          u.uSquareRot.value = squareRot;
          u.uPointerImpulse.value = visualState.pointerImpulse;
          u.uClickPos.value.set(visualState.clickPos[0], visualState.clickPos[1]);
          u.uClickImpulse.value = visualState.clickImpulse;
          u.uClickStrength.value = visualState.clickStrength;
          u.uScroll.value = visualState.scroll;
          u.uNoteOn.value = visualState.noteImpulse;
          u.uEnvelope.value = visualState.envelope;
          u.uFrequency.value = visualState.frequency;
          u.uVelocity.value = visualState.velocity;
          u.uReactivity.value = visualState.reactivity;

          // Feed the active theme's fixed shader constants into uMacros.
          // Reading the store outside React keeps the render loop from
          // re-rendering on theme changes; the store update fires synchronously.
          const sm = THEME_PRESETS[useThemeStore.getState().theme].shaderMacros;
          u.uMacros.value.set(sm[0], sm[1], sm[2], sm[3]);

          // Per-voice color uniforms.
          const rScale = 0.5 + 0.5 * visualState.reactivity;
          u.uNoteFreqNorms.value.set(
            voices[0].colorNorm,
            voices[1].colorNorm,
            voices[2].colorNorm,
            voices[3].colorNorm,
          );
          u.uNoteAmts.value.set(
            voices[0].env * (0.55 + 0.45 * voices[0].vel) * rScale,
            voices[1].env * (0.55 + 0.45 * voices[1].vel) * rScale,
            voices[2].env * (0.55 + 0.45 * voices[2].vel) * rScale,
            voices[3].env * (0.55 + 0.45 * voices[3].vel) * rScale,
          );

          if (particleMesh && particleMat) {
            particleMesh.rotation.z += dt * 0.018;
            particleMat.opacity = 0.18 + visualState.envelope * 0.3;
          }

          renderer.render(scene, camera);

          // Reveal the canvas the moment the first real frame is on screen.
          if (!firstFramePainted) {
            firstFramePainted = true;
            if (!cancelled) onFirstFrameRef.current();
          }
        };

        // Register teardown now that every resource exists, so the abandon
        // guard below can dispose them. animId is 0 until tick runs, and
        // cancelAnimationFrame(0) is a harmless no-op.
        teardown = () => {
          cancelAnimationFrame(animId);
          offVisibility();
          offBus();
          resizeObserver.disconnect();
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerdown", onDown);
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", requestResize);
          swapThemeRef.current = null;
          material.dispose();
          waveTex.dispose();
          planeGeo.dispose();
          particleMesh?.geometry.dispose();
          particleMat?.dispose();
          renderer.dispose();
          // dispose() alone doesn't guarantee the context is released promptly;
          // force it so repeated home visits can't accumulate WebGL contexts.
          renderer.forceContextLoss();
        };

        // A last-moment abandon (unmounted between the await and here) must not
        // start a render loop or fire the reveal — and must dispose what we
        // already built (renderer, listeners, observers).
        if (cancelled) {
          teardown();
          return;
        }

        tick();
      } catch (err) {
        console.error("[WebGLCanvas] setup failed:", err);
        // Fall back to the CSS gradient rather than leaving the page on black.
        if (!cancelled) onUnavailableRef.current();
      }
    })();

    return () => {
      cancelled = true;
      teardown();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full transition-opacity duration-500 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
    />
  );
}
