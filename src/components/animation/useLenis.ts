"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { prefersReducedMotion } from "@/lib/device";
import { setLenisInstance, setLenisWaker } from "./lenisInstance";

// Idle frames before the raf loop parks (~1s at 60Hz).
const SLEEP_AFTER_IDLE_FRAMES = 60;

export function useLenis() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Own loop below: autoRaf never parks.
      autoRaf: false,
    });
    setLenisInstance(lenis);

    let rafId = 0;
    let running = false;
    let idleFrames = 0;

    const loop = (time: number) => {
      lenis.raf(time);
      // isScrolling: false | "native" | "smooth".
      if (lenis.isScrolling === false) {
        idleFrames++;
        if (idleFrames >= SLEEP_AFTER_IDLE_FRAMES) {
          running = false;
          // Reset the clock so the first frame after waking sees dt = 0, not the parked span.
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

    // Anything that can start a scroll wakes the loop. Capture phase so targets can't swallow it.
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
