"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import { useThemeStore } from "@/lib/store";
import type { ThemeId } from "@/components/webgl/materials/shaders/themes";

/**
 * Full-bleed background.
 *
 * The CSS gradient is always in the DOM — visible immediately, stays as
 * a fallback if WebGL is unavailable. The canvas mounts on top once we
 * confirm WebGL works, painting over the gradient.
 */
export function InteractiveBackground() {
  const [webglReady, setWebglReady] = useState(false);

  useEffect(() => {
    try {
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
      setWebglReady(!!gl);
    } catch {
      // stay on CSS fallback
    }
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#08080a]"
    >
      {/* CSS gradient — always present, also serves as loading fallback */}
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

      {/* Canvas overlays gradient once WebGL is confirmed */}
      {webglReady && <WebGLCanvas />}
    </div>
  );
}

function WebGLCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const themeRef = useRef<ThemeId>(theme);
  // Populated by the async setup IIFE; called on theme change to swap the
  // fragment shader on the live material.
  const swapThemeRef = useRef<((next: ThemeId) => void) | null>(null);

  useEffect(() => {
    themeRef.current = theme;
    swapThemeRef.current?.(theme);
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
        ] = await Promise.all([
          import("three"),
          import("@/components/webgl/materials/backgroundMaterial"),
          import("@/lib/visualEvents"),
          import("@/lib/device"),
          import("@/lib/performance"),
        ]);

        // ── Renderer ─────────────────────────────────────────────────────
        const renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        });
        renderer.setClearColor(0x08080a);
        renderer.setPixelRatio(device.getClampedDpr());
        renderer.setSize(window.innerWidth, window.innerHeight);

        // ── Scene ─────────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        // near=-1 keeps our z=0 plane safely inside the frustum.
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

        const material = createBackgroundMaterial(themeRef.current);
        // uResolution must be in physical (buffer) pixels — gl_FragCoord is also
        // physical. Logical CSS pixels would be off by devicePixelRatio.
        material.uniforms.uResolution.value.set(
          renderer.domElement.width,
          renderer.domElement.height,
        );
        scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

        // Wire up live theme swapping. If the user changed theme during the
        // async import, sync to the latest value now.
        let activeTheme = themeRef.current;
        swapThemeRef.current = (next: ThemeId) => {
          if (next === activeTheme) return;
          applyTheme(material, next);
          activeTheme = next;
        };
        if (themeRef.current !== activeTheme) {
          swapThemeRef.current(themeRef.current);
        }

        // ── Particles ─────────────────────────────────────────────────────
        let particleMat: THREE.PointsMaterial | null = null;
        let particleMesh: THREE.Points | null = null;
        if (!device.prefersReducedMotion() && !device.isCoarsePointer()) {
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
        const { visualState, bumpPointerImpulse, triggerClick, tickVisualState, visualBus } = events;

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
          voices[target] = {
            colorNorm: noteToColorNorm(e.note),
            vel: e.velocity,
            env: e.velocity,
          };
        });

        const onMove = (e: PointerEvent) => {
          const x = (e.clientX / window.innerWidth) * 2 - 1;
          const y = -((e.clientY / window.innerHeight) * 2 - 1);
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
          triggerClick(
            (e.clientX / window.innerWidth) * 2 - 1,
            -((e.clientY / window.innerHeight) * 2 - 1),
          );
        };

        const onScroll = () => {
          const h = document.documentElement.scrollHeight - window.innerHeight;
          visualState.scroll = h > 0 ? window.scrollY / h : 0;
        };

        const onResize = () => {
          renderer.setSize(window.innerWidth, window.innerHeight);
          // After resize, domElement.width/height reflect the new physical size.
          material.uniforms.uResolution.value.set(
            renderer.domElement.width,
            renderer.domElement.height,
          );
        };

        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerdown", onDown, { passive: true });
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onResize, { passive: true });
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

        const tick = () => {
          animId = requestAnimationFrame(tick);
          if (paused) return;
          const now = performance.now();
          const dt = Math.min((now - last) / 1000, 0.05);
          last = now;

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

          const u = material.uniforms;
          u.uTime.value += dt;
          u.uShaderTime.value = shaderTime;
          if (pointerHasMoved) {
            u.uPointer.value.set(visualState.pointer[0], visualState.pointer[1]);
          }
          u.uPointerImpulse.value = visualState.pointerImpulse;
          u.uClickPos.value.set(visualState.clickPos[0], visualState.clickPos[1]);
          u.uClickImpulse.value = visualState.clickImpulse;
          u.uScroll.value = visualState.scroll;
          u.uNoteOn.value = visualState.noteImpulse;
          u.uEnvelope.value = visualState.envelope;
          u.uFrequency.value = visualState.frequency;
          u.uVelocity.value = visualState.velocity;
          u.uReactivity.value = visualState.reactivity;

          // Pull active-theme macros from the store each frame. Reading
          // outside React keeps the render loop from re-rendering on every
          // slider tweak; the store update fires synchronously.
          const ts = useThemeStore.getState();
          const m = ts.macros[ts.theme];
          u.uMacros.value.set(m[0], m[1], m[2], m[3]);

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
        };

        tick();

        // Register teardown for when the effect cleans up.
        teardown = () => {
          cancelAnimationFrame(animId);
          offVisibility();
          offBus();
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerdown", onDown);
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", onResize);
          swapThemeRef.current = null;
          material.dispose();
          renderer.dispose();
        };
      } catch (err) {
        console.error("[WebGLCanvas] setup failed:", err);
      }
    })();

    return () => teardown();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
