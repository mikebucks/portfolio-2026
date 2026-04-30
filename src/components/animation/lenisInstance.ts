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
  const top = typeof target === "number" ? target : 0;
  window.scrollTo({ top, behavior: "smooth" });
}
