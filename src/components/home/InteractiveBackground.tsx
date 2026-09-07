"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import { useThemeStore, useIntroStore, useSynthTweakStore } from "@/lib/store";
import { noteColorNorm } from "@/lib/notePalette";
import { FADERS, faderDelta } from "@/lib/synthFaders";
import {
  THEME_PRESETS,
  resolveSettings,
  type ThemeId,
} from "@/components/webgl/materials/shaders/themes";

// Fixed home background. Draws black until the first frame paints, then fades in.
// The CSS gradient shows only when WebGL is unavailable or setup fails.
type Status = "probing" | "loading" | "ready" | "unsupported";

export function InteractiveBackground() {
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

  // Gates the intro reveal.
  useEffect(() => {
    if (status === "ready" || status === "unsupported") {
      useIntroStore.getState().setReady();
    }
  }, [status]);

  return (
    <div
      aria-hidden="true"
      // Stable compositing layer; iOS Safari otherwise breaks the hero's mix-blend on first load.
      style={{ transform: "translateZ(0)" }}
      // 100lvh (.bg-layer-full), not inset-0: iOS toolbar animation resizes inset-0.
      className="pointer-events-none fixed inset-x-0 top-0 bg-layer-full -z-10 overflow-hidden bg-ink"
    >
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
  const swapThemeRef = useRef<((next: ThemeId) => void) | null>(null);

  // Refs: the [] setup effect must not call stale closures.
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

    // StrictMode double-invoke / navigation race guard.
    let cancelled = false;
    let teardown = () => {};

    (async () => {
      try {
        const [
          THREE,
          { createBackgroundMaterial, applyTheme },
          events,
          device,
          perf,
          { WAVE_SIZE, captureWaveform, waveformShape },
        ] = await Promise.all([
          import("three"),
          import("@/components/webgl/materials/backgroundMaterial"),
          import("@/lib/visualEvents"),
          import("@/lib/device"),
          import("@/lib/performance"),
          import("@/lib/audioScope"),
        ]);

        if (cancelled) return;

        const renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        });
        // Clear colour must match the wrapper's bg-ink or the fade-in shows a seam.
        const ink = getComputedStyle(document.documentElement)
          .getPropertyValue("--color-ink")
          .trim();
        if (ink) renderer.setClearColor(ink);

        // Canvas stays at full DPR; the shader draws to a smaller target and is upscaled.
        const outputDpr = device.getClampedDpr();
        renderer.setPixelRatio(outputDpr);
        const lowPower = device.isLowPower();

        // Per-theme render scale: soft themes tolerate upscaling, vibration's
        // hard square and gender's stipple need full resolution.
        const renderScaleForTheme = (t: ThemeId) =>
          t === "causation" ? 0.6
          : t === "polarity" ? 0.65
          : t === "mind" ? 0.6
          : t === "correspondence" ? 0.7
          : t === "rhythm" ? 0.8
          : 1;
        // Adaptive quality scales the target, never the canvas DPR.
        const scaleLevels = [1, 0.85, 0.7, 0.6];
        let qualityScale = scaleLevels[lowPower ? 1 : 0];
        let baseRenderScale = renderScaleForTheme(themeRef.current);
        let renderScale = baseRenderScale * qualityScale;

        const measure = () => ({
          w: canvas.clientWidth || window.innerWidth,
          h: canvas.clientHeight || window.innerHeight,
        });

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

        const material = createBackgroundMaterial(themeRef.current);
        const planeGeo = new THREE.PlaneGeometry(2, 2);
        scene.add(new THREE.Mesh(planeGeo, material));

        // Low-res target, sized in resizeRenderTarget.
        const rt = new THREE.WebGLRenderTarget(1, 1, {
          depthBuffer: false,
          stencilBuffer: false,
        });
        rt.texture.minFilter = THREE.LinearFilter;
        rt.texture.magFilter = THREE.LinearFilter;
        rt.texture.generateMipmaps = false;
        let rtW = 0;
        let rtH = 0;

        // Raw blit: no colour-space encode or tone-mapping.
        const screenScene = new THREE.Scene();
        const screenMat = new THREE.ShaderMaterial({
          depthTest: false,
          depthWrite: false,
          uniforms: { uScene: { value: rt.texture } },
          vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = vec4(position.xy, 0.0, 1.0);
            }
          `,
          fragmentShader: /* glsl */ `
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D uScene;
            void main() { gl_FragColor = texture2D(uScene, vUv); }
          `,
        });
        const screenGeo = new THREE.PlaneGeometry(2, 2);
        screenScene.add(new THREE.Mesh(screenGeo, screenMat));

        // Resizes are recorded here and applied inside tick: setSize clears the
        // buffer, and iOS presents that black frame mid-toolbar-animation.
        const isTouch = device.isCoarsePointer();
        // Above toolbar deltas (~50-120px), below an orientation change.
        const CHROME_JITTER = 200;

        let pendingW = 0;
        let pendingH = 0;
        let appliedW = -1;
        let appliedH = -1;

        // Cached on resize; reading scrollHeight/rect per event forces layout.
        let scrollRange = 0;
        let canvasRect: Pick<DOMRect, "left" | "top" | "width" | "height"> = {
          left: 0,
          top: 0,
          width: 1,
          height: 1,
        };
        // Last input time, for the idle governor.
        let lastActivityAt = performance.now();

        const requestResize = () => {
          scrollRange =
            document.documentElement.scrollHeight - window.innerHeight;
          canvasRect = canvas.getBoundingClientRect();
          lastActivityAt = performance.now();
          const { w, h } = measure();
          // lvh is unreliable in some in-app browsers; swallow chrome jitter.
          if (isTouch && w === pendingW && Math.abs(h - pendingH) < CHROME_JITTER) {
            return;
          }
          pendingW = w;
          pendingH = h;
        };

        // uResolution tracks the target, not the canvas.
        const resizeRenderTarget = () => {
          const cw = renderer.domElement.width;
          const ch = renderer.domElement.height;
          const rw = Math.max(1, Math.round(cw * renderScale));
          const rh = Math.max(1, Math.round(ch * renderScale));
          if (rw === rtW && rh === rtH) return;
          rtW = rw;
          rtH = rh;
          rt.setSize(rw, rh);
          material.uniforms.uResolution.value.set(rw, rh);
        };

        const applyPendingResize = () => {
          if (pendingW === appliedW && pendingH === appliedH) return;
          appliedW = pendingW;
          appliedH = pendingH;
          renderer.setSize(appliedW, appliedH, false);
          resizeRenderTarget();
        };

        requestResize();
        applyPendingResize();

        const applyRenderScale = () => {
          const next = baseRenderScale * qualityScale;
          if (next === renderScale) return;
          renderScale = next;
          resizeRenderTarget();
        };

        const quality = perf.createAdaptiveQuality({
          dprLevels: scaleLevels,
          startLevel: lowPower ? 1 : 0,
          onChange: (scale) => {
            qualityScale = scale;
            applyRenderScale();
          },
        });

        let activeTheme = themeRef.current;
        swapThemeRef.current = (next: ThemeId) => {
          if (next === activeTheme) return;
          applyTheme(material, next);
          activeTheme = next;
          baseRenderScale = renderScaleForTheme(next);
          applyRenderScale();
          lastActivityAt = performance.now();
        };
        // Theme may have changed during the async import.
        if (themeRef.current !== activeTheme) {
          swapThemeRef.current(themeRef.current);
        }

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
          // Screen pass, so particles stay crisp at full resolution.
          screenScene.add(particleMesh);
        }

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

        // Polyphonic colour: each note claims a voice, envelopes decay independently.
        type Voice = { colorNorm: number; vel: number; env: number };
        const voices: Voice[] = Array.from({ length: 4 }, () => ({
          colorNorm: 0, vel: 0, env: 0,
        }));


        // Correspondence divide: steps 45° clockwise per note. Rest = 3π/4 diagonal.
        let divideAngleTarget = (3 * Math.PI) / 4;
        let divideAngle = divideAngleTarget;

        const offBus = visualBus.on((e) => {
          if (e.type !== "note_on") return;
          lastActivityAt = performance.now();

          divideAngleTarget -= Math.PI / 4;
          // Free slot, else steal the quietest voice.
          let target = 0;
          let lowestEnv = Infinity;
          for (let i = 0; i < voices.length; i++) {
            if (voices[i].env < 0.02) { target = i; break; }
            if (voices[i].env < lowestEnv) { lowestEnv = voices[i].env; target = i; }
          }
          // sourceNote, not note: a transposed key must keep its own cap colour.
          const colorNorm = noteColorNorm(e.sourceNote);
          voices[target] = {
            colorNorm,
            vel: e.velocity,
            env: e.velocity,
          };

          // Click placed by pitch (~70-1100Hz, left to right), quieter than a real click.
          const pitchNorm =
            Math.log2(Math.max(e.frequency, 1) / 70) / Math.log2(1100 / 70);
          triggerClick(
            Math.max(-1, Math.min(1, pitchNorm * 2 - 1)),
            -0.1,
            0.45 * Math.max(e.velocity, 0.6),
          );
        });

        const onMove = (e: PointerEvent) => {
          const rect = canvasRect;
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
          lastActivityAt = performance.now();
          lastX = x; lastY = y;
        };

        const onDown = (e: PointerEvent) => {
          lastActivityAt = performance.now();
          if (arePointerClicksLocked()) return;
          const rect = canvasRect;
          triggerClick(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -(((e.clientY - rect.top) / rect.height) * 2 - 1),
          );
        };

        const onScroll = () => {
          visualState.scroll =
            scrollRange > 0 ? window.scrollY / scrollRange : 0;
          lastActivityAt = performance.now();
        };

        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerdown", onDown, { passive: true });
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", requestResize, { passive: true });
        // Banner layout can change without a window resize.
        const resizeObserver = new ResizeObserver(requestResize);
        resizeObserver.observe(canvas);
        onScroll();

        const offVisibility = perf.onVisibilityChange((v) => { paused = !v; });

        let animId = 0;
        let paused = false;
        let last = performance.now();
        // Monotonic phase: 5% pace at rest, full pace at peak click/note input.
        let shaderTime = 0;
        // Rhythm mandala: spring-eased 0..1 with a hold timer.
        let formMorph = 0;
        let formVel = 0;
        let formHold = 0;
        // One waveform cycle as a 256x1 RGBA byte texture (no float extension needed).
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
        uploadWave();

        const pointerLag: [number, number] = [-9, -9];
        let pointerLagPrimed = false;
        let squareRot = 0;
        let viewTilt = 0;

        // Fader offsets from the preset (-1..1, see lib/synthFaders), eased per frame.
        // Read from the store, not the engine: the engine only exists after audio unlock.
        const synthTarget = [0, 0, 0, 0];
        const synthLive = [0, 0, 0, 0];
        // Rhythm pendulum count: 8..26..32 by volume fader. Even, so the mandala pairs mirror.
        let pendTarget = 26;
        let pendLive = 26;
        // Integrated here so the delay fader changes rate without phase stepping back.
        let wavePhase = 0;
        const WAVE_SPEED = 1.5; // mirrors rhythm.ts
        let lastOverrides: object | null = null;
        let lastSynthTheme: ThemeId | null = null;
        const roundEven = (x: number) => 2 * Math.round(x / 2);
        let firstFramePainted = false;

        // Idle governor: full rate while input-coupled, 30fps once settled.
        // State still integrates with real dt, so motion speed is unchanged.
        const ACTIVE_WINDOW_MS = 3000;
        const IDLE_FRAME_MS = 1000 / 30 - 2; // -2ms vsync jitter tolerance
        let lastDrawAt = 0;

        const tick = () => {
          animId = requestAnimationFrame(tick);
          // `last` not advanced; the dt clamp absorbs the gap on resume.
          if (paused) return;
          const now = performance.now();
          const dt = Math.min((now - last) / 1000, 0.05);
          last = now;

          tickVisualState(dt);

          for (const voice of voices) {
            voice.env = Math.max(0, voice.env - dt * 1.2);
          }

          // Click + note drive time; pointer is spatial only.
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

          // False on silence: the last cycle stays in place.
          if (captureWaveform(visualState.frequency)) uploadWave();

          const u = material.uniforms;
          u.uTime.value += dt;
          u.uShaderTime.value = shaderTime;
          u.uNotePulse.value = pulse;
          if (pointerHasMoved) {
            u.uPointer.value.set(visualState.pointer[0], visualState.pointer[1]);
            // Snap on first move so it doesn't crawl in from the off-screen sentinel.
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

          // Vibration square follows the cursor within its corner's quadrant;
          // eased so crossing an axis drifts rather than snaps. Mirrors vibration.ts.
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
              // Cursor angle folded into its quadrant's ±45°.
              const residual =
                Math.atan2(my, mx) - Math.atan2(Math.sign(my), Math.sign(mx));
              // Matches the shader's smoothstep(0.0, 0.06, md).
              const g = Math.min(1, Math.max(0, md / 0.06));
              squareRotTarget = residual * 0.32 * (g * g * (3 - 2 * g));
            }
          }
          squareRot +=
            (squareRotTarget - squareRot) * (1 - Math.exp(-dt / 0.32));
          u.uSquareRot.value = squareRot;

          // Polarity camera tilt: fast up with the attack, slow down with the decay.
          const tiltTarget = Math.min(1, visualState.envelope * 1.3);
          viewTilt +=
            (tiltTarget - viewTilt) *
            (1 - Math.exp(-dt / (tiltTarget > viewTilt ? 0.20 : 0.90)));
          u.uViewTilt.value = viewTilt;

          divideAngle +=
            (divideAngleTarget - divideAngle) * (1 - Math.exp(-dt / 0.2));
          u.uDivideAngle.value = divideAngle;

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

          const theme = useThemeStore.getState().theme;
          const sm = THEME_PRESETS[theme].shaderMacros;
          u.uMacros.value.set(sm[0], sm[1], sm[2], sm[3]);

          // `overrides` identity changes only when a fader moves. A theme swap
          // snaps: the old preset's values must not bleed into the new shader.
          const ov = useSynthTweakStore.getState().overrides;
          if (ov !== lastOverrides || theme !== lastSynthTheme) {
            const snap = theme !== lastSynthTheme;
            lastOverrides = ov;
            lastSynthTheme = theme;
            const base = resolveSettings(theme);
            const merged = { ...base, ...ov };
            for (let k = 0; k < 4; k++) {
              synthTarget[k] = faderDelta(
                FADERS[k].getT(merged),
                FADERS[k].getT(base),
              );
            }
            const dv = synthTarget[0];
            pendTarget = roundEven(
              Math.min(32, Math.max(8, 26 + (dv < 0 ? 18 * dv : 6 * dv))),
            );
            if (snap) {
              for (let k = 0; k < 4; k++) synthLive[k] = synthTarget[k];
              pendLive = pendTarget;
            }
            lastActivityAt = now;
          }

          // Snap the last hair so the idle governor sees them settle.
          let synthMoving = false;
          const kS = 1 - Math.exp(-dt / 0.25);
          for (let k = 0; k < 4; k++) {
            const d = synthTarget[k] - synthLive[k];
            if (Math.abs(d) < 1e-3) synthLive[k] = synthTarget[k];
            else {
              synthLive[k] += d * kS;
              synthMoving = true;
            }
          }
          {
            const d = pendTarget - pendLive;
            if (Math.abs(d) < 1e-3) pendLive = pendTarget;
            else {
              pendLive += d * (1 - Math.exp(-dt / 0.3));
              synthMoving = true;
            }
          }
          u.uSynth.value.set(
            synthLive[0], synthLive[1], synthLive[2], synthLive[3],
          );
          u.uPendCount.value = pendLive;

          // Same increment as the shader's `phase`, times the delay fader's rate.
          const drive = 2.6 * (0.55 + 0.9 * sm[2]);
          const waveRate = Math.exp(-0.8 * synthLive[3]);
          wavePhase += dt * (0.78 + rate * drive) * WAVE_SPEED * waveRate;
          u.uWaveClock.value.set(wavePhase, waveRate);

          // Damping 14 in (one small overshoot), 7 out (visible bounce).
          if (visualState.noteImpulse > 0.5) formHold = 0.9;
          formHold = Math.max(0, formHold - dt);
          {
            const sdt = Math.min(dt, 0.05);
            const target = formHold > 0 ? 1 : 0;
            const damping = target > 0 ? 14 : 7;
            formVel += (130 * (target - formMorph) - damping * formVel) * sdt;
            formMorph += formVel * sdt;
          }
          u.uFormMorph.value = formMorph;

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

          // Nothing reaches the GPU before the draws below, so skipping skips the frame.
          const active =
            now - lastActivityAt < ACTIVE_WINDOW_MS ||
            visualState.pointerImpulse > 0.001 ||
            visualState.clickImpulse > 0.001 ||
            visualState.noteImpulse > 0.001 ||
            visualState.envelope > 0.001 ||
            formHold > 0 ||
            Math.abs(formVel) > 0.01 ||
            viewTilt > 0.01 ||
            synthMoving ||
            !firstFramePainted;
          if (active) {
            // Only sample at full rate; governed frames would read as a slow GPU.
            quality.tick();
          } else if (now - lastDrawAt < IDLE_FRAME_MS) {
            return;
          }
          lastDrawAt = now;

          // Inside the draw gate: resizing clears the buffer, so only on a repaint frame.
          applyPendingResize();

          renderer.setRenderTarget(rt);
          renderer.render(scene, camera);
          renderer.setRenderTarget(null);
          renderer.render(screenScene, camera);

          if (!firstFramePainted) {
            firstFramePainted = true;
            if (!cancelled) onFirstFrameRef.current();
          }
        };

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
          rt.dispose();
          screenMat.dispose();
          screenGeo.dispose();
          particleMesh?.geometry.dispose();
          particleMat?.dispose();
          renderer.dispose();
          // dispose() alone leaks contexts across repeated visits.
          renderer.forceContextLoss();
        };

        // Unmounted between the await and here.
        if (cancelled) {
          teardown();
          return;
        }

        tick();
      } catch (err) {
        console.error("[WebGLCanvas] setup failed:", err);
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
