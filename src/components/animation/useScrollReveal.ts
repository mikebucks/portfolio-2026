"use client";

import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/device";

// One-shot scroll-in reveal on the project modal's timing (ProjectModal.tsx):
// each block parks invisible, then lands over 0.9s expo.out as it enters the
// viewport. Blocks that arrive in the same IntersectionObserver callback — the
// a couple of project cards on a fast scroll —
// cascade with the modal's 0.18s stagger, in document order, so the page and
// the case study share one motion vocabulary.
//
// Three moves, chosen per element by the attribute's value:
//   data-reveal          rise: 24px down → in place (the modal's own move)
//   data-reveal="scale"  grow: 0.9 → 1 about the centre
//   data-reveal="fade"   opacity only — for blocks whose transform is owned
//                        by something else (the project cards' scroll scale)
// All fade in alongside.
//
// Reduced-motion users never get the pre-hide, so nothing depends on the
// observer firing for the content to be visible.
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

export function useScrollReveal(
  rootRef: RefObject<HTMLElement | null>,
  selector = "[data-reveal]",
) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (!targets.length) return;

    targets.forEach((el) =>
      gsap.set(el, { ...FROM[kindOf(el)], force3D: true }),
    );

    const io = new IntersectionObserver(
      (entries) => {
        const batch = entries
          .filter((e) => e.isIntersecting)
          .map((e) => e.target as HTMLElement)
          // Entries aren't guaranteed to arrive in DOM order.
          .sort((a, b) =>
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
              ? -1
              : 1,
          );
        if (!batch.length) return;

        // One tween per element rather than one staggered tween for the
        // batch: a batch can mix moves (a card and a row in the same
        // callback), so the stagger is applied by hand as a delay.
        batch.forEach((el, i) => {
          io.unobserve(el);
          gsap.to(el, {
            ...TO[kindOf(el)],
            duration: 0.9,
            ease: "expo.out",
            delay: i * STAGGER_S,
            force3D: true,
            overwrite: true,
            // Leave nothing inline once landed: a lingering translate3d would
            // open a stacking context on the project cards, which need to
            // compete at page level for their hover ring (see Projects).
            clearProps: "opacity,transform",
          });
        });
      },
      // Trigger a little inside the bottom edge so a block is moving as it
      // enters, not after. The huge top margin keeps anything scrolled PAST
      // still "intersecting" — a fast jump can put a block above the viewport
      // between observations, and without this it would stay invisible.
      { rootMargin: "100000px 0px -10% 0px" },
    );
    targets.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      gsap.killTweensOf(targets);
      gsap.set(targets, { clearProps: "opacity,transform" });
    };
  }, [rootRef, selector]);
}
