"use client";

import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/device";

// One-shot scroll-in reveal on ProjectModal's timing. data-reveal picks the
// move: rise (default), "scale", or "fade" (when something else owns the transform).
const STAGGER_S = 0.18;

const FROM = {
  rise: { opacity: 0, y: 24 },
  scale: { opacity: 0, scale: 0.9, transformOrigin: "50% 50%" },
  fade: { opacity: 0 },
} as const;
const TO = {
  rise: { opacity: 1, y: 0 },
  scale: { opacity: 1, scale: 1 },
  fade: { opacity: 1 },
} as const;

const kindOf = (el: HTMLElement): keyof typeof FROM => {
  const kind = el.dataset.reveal;
  return kind === "scale" || kind === "fade" ? kind : "rise";
};

export function useScrollReveal(rootRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (!targets.length) return;

    targets.forEach((el) =>
      gsap.set(el, { ...FROM[kindOf(el)], force3D: true }),
    );

    const io = new IntersectionObserver(
      (entries) => {
        const batch = entries
          .filter((e) => e.isIntersecting)
          .map((e) => e.target as HTMLElement)
          // Entries aren't in DOM order.
          .sort((a, b) =>
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
              ? -1
              : 1,
          );
        if (!batch.length) return;

        // One tween each: a batch can mix moves, so stagger by delay.
        batch.forEach((el, i) => {
          io.unobserve(el);
          gsap.to(el, {
            ...TO[kindOf(el)],
            duration: 0.9,
            ease: "expo.out",
            delay: i * STAGGER_S,
            force3D: true,
            overwrite: true,
            // A lingering translate3d would open a stacking context on the cards.
            clearProps: "opacity,transform",
          });
        });
      },
      // Huge top margin: blocks jumped past must still count as intersecting.
      { rootMargin: "100000px 0px -10% 0px" },
    );
    targets.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      gsap.killTweensOf(targets);
      gsap.set(targets, { clearProps: "opacity,transform" });
    };
  }, [rootRef]);
}
