import { isClient } from "./device";

export type AdaptiveQualityOptions = {
  /** DPR steps, best → worst (index 0 is full quality). */
  dprLevels: number[];
  /** Starting index into dprLevels (e.g. 1 to begin degraded on weak devices). */
  startLevel?: number;
  /** Step DOWN a level once the average FPS stays below this for `downMs`. */
  lowFps?: number;
  /** Step UP a level once the average FPS stays above this for `upMs`. */
  highFps?: number;
  /** Sustained ms below `lowFps` before stepping down. */
  downMs?: number;
  /** Sustained ms above `highFps` before stepping up (longer — upgrades cautiously). */
  upMs?: number;
  /** Rolling window (frames) the average is taken over. */
  windowSize?: number;
  /** Called with the new DPR whenever the quality level changes. */
  onChange: (dpr: number) => void;
};

/**
 * Adaptive-quality controller. Watches the running-average frame rate and steps
 * the render DPR down when the GPU can't keep up, back up when it recovers.
 *
 * Hysteresis, so it can't oscillate:
 *   • a dead band between `lowFps` and `highFps` where neither timer accumulates
 *   • separate sustained-duration gates (`downMs` short, `upMs` long) so a brief
 *     dip degrades quickly but a recovery has to hold before we push DPR back up
 *   • samples are cleared after each change, so the new level is judged fresh
 *
 * Call `tick()` once per rendered frame (NOT while paused). Frames longer than
 * 100ms (a resume after a pause/stall) are ignored so they don't read as "slow".
 */
export function createAdaptiveQuality(opts: AdaptiveQualityOptions) {
  const {
    dprLevels,
    lowFps = 45,
    highFps = 58,
    downMs = 1000,
    upMs = 3000,
    windowSize = 60,
    onChange,
  } = opts;

  let level = Math.min(
    Math.max(opts.startLevel ?? 0, 0),
    dprLevels.length - 1,
  );
  const samples: number[] = [];
  let last = performance.now();
  let timeBelow = 0;
  let timeAbove = 0;

  const reset = () => {
    samples.length = 0;
    timeBelow = 0;
    timeAbove = 0;
  };

  return {
    /** Current DPR for the active level. */
    dpr() {
      return dprLevels[level];
    },
    tick() {
      const now = performance.now();
      const dt = now - last;
      last = now;
      // Ignore non-positive and resume/stall frames — they aren't steady state.
      if (dt <= 0 || dt > 100) return;

      samples.push(1000 / dt);
      if (samples.length > windowSize) samples.shift();
      if (samples.length < windowSize) return;

      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;

      if (avg < lowFps) {
        timeBelow += dt;
        timeAbove = 0;
      } else if (avg > highFps) {
        timeAbove += dt;
        timeBelow = 0;
      } else {
        // Dead band — hold steady.
        timeBelow = 0;
        timeAbove = 0;
      }

      if (timeBelow >= downMs && level < dprLevels.length - 1) {
        level++;
        reset();
        onChange(dprLevels[level]);
      } else if (timeAbove >= upMs && level > 0) {
        level--;
        reset();
        onChange(dprLevels[level]);
      }
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
