"use client";

import type Lenis from "lenis";

let instance: Lenis | null = null;

// Restarts useLenis's parked raf loop before a programmatic scroll.
let waker: (() => void) | null = null;

export function getLenisInstance(): Lenis | null {
  return instance;
}

export function setLenisInstance(lenis: Lenis | null) {
  instance = lenis;
}

export function setLenisWaker(fn: (() => void) | null) {
  waker = fn;
}

/** Collapsed header bottom edge (px), where sections land. Not --header-h: that overshoots from the top. */
export function headerOffset(): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(
    "--section-scroll-offset",
  );
  return Number.parseFloat(value) || 0;
}

export function smoothScrollTo(target: number | string | HTMLElement) {
  // Numbers are absolute positions; elements/selectors are sections that clear the header.
  const offset = typeof target === "number" ? 0 : -headerOffset();

  if (instance) {
    waker?.();
    instance.scrollTo(target, { duration: 1.1, offset });
    return;
  }

  // No Lenis (reduced motion).
  const el =
    typeof target === "string"
      ? document.querySelector<HTMLElement>(target)
      : target instanceof HTMLElement
        ? target
        : null;

  const top =
    typeof target === "number"
      ? target
      : el
        ? el.getBoundingClientRect().top + window.scrollY
        : 0;

  window.scrollTo({ top: Math.max(0, top + offset), behavior: "smooth" });
}
