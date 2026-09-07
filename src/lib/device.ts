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

export function getClampedDpr() {
  if (!isClient()) return 1;
  // Canvas-only cap. Above 1.5 the shader gains nothing visible for ~27% more blit cost.
  const cap = isCoarsePointer() ? 1.25 : 1.5;
  return Math.min(window.devicePixelRatio || 1, cap);
}
