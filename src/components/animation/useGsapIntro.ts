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
      // force3D leaves an inline translate3d(0,0,0) so the resting element
      // stays on a GPU compositing layer — required for mix-blend-difference
      // on iOS Safari (see note below).
      gsap.set(targets, { opacity: 1, y: 0, force3D: true });
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
        // iOS Safari only blends an element with mix-blend-difference when
        // it sits on a GPU compositing layer that matches the shader canvas
        // behind it. force3D keeps the resting transform as translate3d
        // (rather than 2D), and we deliberately do NOT clear `transform`
        // or `willChange` from clearProps — letting them persist is what
        // pins the element on its GPU layer after the intro finishes.
        // Stripping them was making the H1 stop blending until a scroll
        // forced iOS to recompose layers.
        force3D: true,
        clearProps: "opacity",
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return ref;
}
