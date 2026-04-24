"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/device";

/**
 * GSAP hero intro — staggered reveal of anything tagged `data-intro`.
 * Respects prefers-reduced-motion by skipping straight to the final state.
 */
export function useGsapIntro<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current) return;
    const targets = ref.current.querySelectorAll<HTMLElement>("[data-intro]");
    if (targets.length === 0) return;

    if (prefersReducedMotion()) {
      gsap.set(targets, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.from(targets, {
        opacity: 0,
        y: 24,
        duration: 0.9,
        ease: "expo.out",
        stagger: 0.08,
        delay: 0.1,
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return ref;
}
