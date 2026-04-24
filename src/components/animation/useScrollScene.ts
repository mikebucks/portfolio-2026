"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/device";

/**
 * Register a simple scroll-linked timeline on the given element. Uses a
 * plain IntersectionObserver + scroll progress so we don't pull in
 * ScrollTrigger unless/until a view truly needs it.
 */
export function useScrollScene<T extends HTMLElement>(
  build: (el: T) => gsap.core.Timeline | null,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    const tl = build(el);
    if (!tl) return;
    tl.pause();

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = gsap.utils.clamp(
        0,
        1,
        1 - (rect.top + rect.height) / (vh + rect.height),
      );
      tl.progress(p);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      tl.kill();
    };
  }, [build]);

  return ref;
}
