import { isClient } from "./device";

export type AdaptiveQualityOptions = {
  /** Best -> worst. */
  dprLevels: number[];
  startLevel?: number;
  onChange: (dpr: number) => void;
};

// Step down after 1s under 45fps, up after 3s over 58fps; 60-frame average.
const lowFps = 45;
const highFps = 58;
const downMs = 1000;
const upMs = 3000;
const windowSize = 60;

// Steps DPR down when average FPS drops, back up when it recovers.
// Dead band + sustained timers give hysteresis. Call tick() per rendered frame.
export function createAdaptiveQuality(opts: AdaptiveQualityOptions) {
  const { dprLevels, onChange } = opts;

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
    dpr() {
      return dprLevels[level];
    },
    tick() {
      const now = performance.now();
      const dt = now - last;
      last = now;
      // >100ms is a resume/stall, not a slow frame.
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

export function onVisibilityChange(cb: (visible: boolean) => void) {
  if (!isClient()) return () => {};
  const handler = () => cb(!document.hidden);
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}
