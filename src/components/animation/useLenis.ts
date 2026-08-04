"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { prefersReducedMotion } from "@/lib/device";
import { setLenisInstance, setLenisWaker } from "./lenisInstance";

// Consecutive frames of `isScrolling === false` before the raf loop parks
// itself (~1s at 60Hz). Waking is event-driven, so parking adds no input
// latency — the loop restarts on the same frame input arrives.
const SLEEP_AFTER_IDLE_FRAMES = 60;

export function useLenis() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Driven by our own loop below instead: Lenis's autoRaf runs at display
      // rate forever, even when nothing has scrolled for minutes. Ours parks
      // once the scroll settles and wakes on the inputs that can start one.
      autoRaf: false,
    });
    setLenisInstance(lenis);

    let rafId = 0;
    let running = false;
    let idleFrames = 0;

    const loop = (time: number) => {
      lenis.raf(time);
      // `isScrolling` is false | "native" | "smooth" — anything truthy means
      // an animation or native scroll (with its 400ms settle timer) is live.
      if (lenis.isScrolling === false) {
        idleFrames++;
        if (idleFrames >= SLEEP_AFTER_IDLE_FRAMES) {
          running = false;
          // Zero Lenis's internal clock so the first frame after waking
          // computes dt = 0 instead of the whole parked span — a large dt
          // would jump an animation the waking input just started.
          (lenis as unknown as { time: number }).time = 0;
          return;
        }
      } else {
        idleFrames = 0;
      }
      rafId = requestAnimationFrame(loop);
    };

    const wake = () => {
      if (running) return;
      running = true;
      idleFrames = 0;
      rafId = requestAnimationFrame(loop);
    };
    wake();

    // Anything that can start a scroll restarts the loop: wheel/touch for
    // smooth scrolling, keys and native scrollbar for native scrolls, resize
    // for reflow-driven position changes. Capture phase so waking never
    // depends on what the event's target does with it; the handler is a
    // no-op flag check while the loop is already running.
    const wakeEvents = [
      "wheel",
      "touchstart",
      "pointerdown",
      "keydown",
      "scroll",
      "resize",
    ] as const;
    for (const ev of wakeEvents) {
      window.addEventListener(ev, wake, { passive: true, capture: true });
    }
    // Programmatic scrolls (nav links → smoothScrollTo) also need the loop.
    setLenisWaker(wake);

    return () => {
      for (const ev of wakeEvents) {
        window.removeEventListener(ev, wake, { capture: true });
      }
      setLenisWaker(null);
      cancelAnimationFrame(rafId);
      running = false;
      lenis.destroy();
      setLenisInstance(null);
    };
  }, []);
}
