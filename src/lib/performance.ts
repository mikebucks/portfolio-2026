import { isClient } from "./device";

/**
 * Lightweight FPS guard. Reports when the running average drops below a
 * threshold so the visual layer can reduce work (lower DPR, skip passes).
 */
export function createFpsGuard(threshold = 45, windowSize = 60) {
  const samples: number[] = [];
  let last = performance.now();
  let belowCallback: (() => void) | null = null;
  let fired = false;

  return {
    tick() {
      const now = performance.now();
      const dt = now - last;
      last = now;
      if (dt <= 0) return;
      const fps = 1000 / dt;
      samples.push(fps);
      if (samples.length > windowSize) samples.shift();
      if (samples.length === windowSize && !fired) {
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        if (avg < threshold) {
          fired = true;
          belowCallback?.();
        }
      }
    },
    onBelowThreshold(cb: () => void) {
      belowCallback = cb;
    },
  };
}

/** Pause a callback when the tab is hidden. */
export function onVisibilityChange(cb: (visible: boolean) => void) {
  if (!isClient()) return () => {};
  const handler = () => cb(!document.hidden);
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}
