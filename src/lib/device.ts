export function isClient() {
  return typeof window !== "undefined";
}

export function prefersReducedMotion() {
  if (!isClient()) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isCoarsePointer() {
  if (!isClient()) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

export function isLowPower() {
  if (!isClient()) return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  const fewCores =
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency <= 4;
  return lowMemory || fewCores;
}

export function hasWebGL(): boolean {
  if (!isClient()) return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") || canvas.getContext("webgl")
    );
  } catch {
    return false;
  }
}

export function getClampedDpr() {
  if (!isClient()) return 1;
  // Canvas-only cap (DOM text is unaffected). 1.5 on fine pointers: the shader
  // content is soft enough that the last quarter-DPR is invisible, but it costs
  // ~27% of the blit pass and compositor bandwidth.
  const cap = isCoarsePointer() ? 1.25 : 1.5;
  return Math.min(window.devicePixelRatio || 1, cap);
}
