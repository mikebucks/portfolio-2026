"use client";

import { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Teardown registered asynchronously once setup completes.
    let teardown = () => {};

    (async () => {
      try {
        const [THREE, { createBackgroundMaterial }, events, device, perf] =
          await Promise.all([
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

        const material = createBackgroundMaterial();
        material.uniforms.uResolution.value.set(
          window.innerWidth,
          window.innerHeight,
        );
        scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

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
        const { visualState, bumpPointerImpulse, triggerClick, tickVisualState } = events;

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
          material.uniforms.uResolution.value.set(
            window.innerWidth,
            window.innerHeight,
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

        const tick = () => {
          animId = requestAnimationFrame(tick);
          if (paused) return;
          const now = performance.now();
          const dt = Math.min((now - last) / 1000, 0.05);
          last = now;

          tickVisualState(dt);

          const u = material.uniforms;
          u.uTime.value += dt;
          u.uPointer.value.set(visualState.pointer[0], visualState.pointer[1]);
          u.uPointerImpulse.value = visualState.pointerImpulse;
          u.uClickPos.value.set(visualState.clickPos[0], visualState.clickPos[1]);
          u.uClickImpulse.value = visualState.clickImpulse;
          u.uScroll.value = visualState.scroll;
          u.uNoteOn.value = visualState.noteImpulse;
          u.uEnvelope.value = visualState.envelope;
          u.uFrequency.value = visualState.frequency;
          u.uVelocity.value = visualState.velocity;
          u.uReactivity.value = visualState.reactivity;

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
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerdown", onDown);
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", onResize);
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
