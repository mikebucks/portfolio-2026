"use client";

import type Lenis from "lenis";

let instance: Lenis | null = null;

export function getLenisInstance(): Lenis | null {
  return instance;
}

export function setLenisInstance(lenis: Lenis | null) {
  instance = lenis;
}

export function smoothScrollTo(target: number | string | HTMLElement) {
  if (instance) {
    instance.scrollTo(target, { duration: 1.1 });
    return;
  }

  // Fallback path (no Lenis — e.g. reduced-motion users). Resolve string
  // selectors and elements to a scroll offset rather than defaulting to the top,
  // so direct loads of /#about land on the right section.
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

  window.scrollTo({ top, behavior: "smooth" });
}
