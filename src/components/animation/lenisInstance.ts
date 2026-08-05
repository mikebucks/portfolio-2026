"use client";

import type Lenis from "lenis";

let instance: Lenis | null = null;

// Restarts the driving raf loop (see useLenis) — it parks while idle, and a
// programmatic scrollTo would otherwise animate nothing until the next input.
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

/**
 * How far below the viewport top a scrolled-to section should come to rest: the
 * bottom edge of the fixed header (published by Header as
 * --section-scroll-offset), so the section lands just under the bar instead of
 * behind it. Zero until the header has measured itself, which only leaves the
 * old flush-to-top behaviour.
 *
 * Note that the published value is the header's *collapsed* bottom edge — any
 * scroll past the hero collapses the bar, so that's the one a section is
 * actually landing under. Reading the live `--header-h` instead would over-shoot
 * by the padding delta on the most common click of all: a nav link pressed while
 * still sitting at the top of the page.
 */
function headerOffset(): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(
    "--section-scroll-offset",
  );
  return Number.parseFloat(value) || 0;
}

export function smoothScrollTo(target: number | string | HTMLElement) {
  // Numeric targets are absolute scroll positions (the wordmark's scroll to
  // top), so they're taken as given; element/selector targets are sections,
  // which need clearing the header.
  const offset = typeof target === "number" ? 0 : -headerOffset();

  if (instance) {
    waker?.();
    instance.scrollTo(target, { duration: 1.1, offset });
    return;
  }

  // Fallback path (no Lenis — e.g. reduced-motion users). Resolve string
  // selectors and elements to a scroll offset rather than defaulting to the top,
  // so direct loads of /about land on the right section.
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
