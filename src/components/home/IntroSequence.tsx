"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/device";
import { useIntroStore } from "@/lib/store";

// Load intro: cream cover (SSR) wipes up once the shader paints (`ready`),
// then the header drops in and the headline flies up.
// Header and headline are reached by selector; the overlay is our own element.

// Once per page load; client re-entries skip to the rest state.
let introHasRun = false;

// Reveal anyway if `ready` never fires.
const READY_TIMEOUT_MS = 3000;

export function IntroSequence() {
  const overlayRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const header = document.querySelector<HTMLElement>("[data-intro-header]");
    const headline = Array.from(
      document.querySelectorAll<HTMLElement>("[data-intro]"),
    );

    const { setReady, setHeadlinePlay } = useIntroStore.getState();

    // force3D stays inline on the headline: iOS Safari needs the compositing
    // layer for mix-blend-difference against the shader. Never clearProps transform.

    if (introHasRun || prefersReducedMotion()) {
      gsap.set(overlay, { yPercent: -100, autoAlpha: 0 });
      if (header) gsap.set(header, { yPercent: 0, autoAlpha: 1 });
      gsap.set(headline, { opacity: 1, y: 0, force3D: true });
      setHeadlinePlay();
      introHasRun = true;
      return;
    }

    let unsubscribe = () => {};
    let timeout = 0;
    let played = false;

    const ctx = gsap.context(() => {
      if (header) gsap.set(header, { yPercent: -110, autoAlpha: 0 });
      gsap.set(headline, { opacity: 0, y: 24, force3D: true });

      const play = () => {
        if (played) return;
        played = true;
        introHasRun = true;
        window.clearTimeout(timeout);
        unsubscribe();

        const tl = gsap.timeline();

        tl.to(overlay, {
          yPercent: -100,
          duration: 0.55,
          ease: "expo.out",
          delay: 0.15,
        });

        if (header) {
          tl.to(
            header,
            { yPercent: 0, autoAlpha: 1, duration: .7, ease: "expo.out", delay: 0.05 },
            "-=0.25",
          );
        }

        // Releases CyclingWord's roll in step with the headline.
        tl.add(() => setHeadlinePlay(), "-=0.15");
        tl.to(
          headline,
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "expo.out",
            delay: 0.25,
            stagger: 0.18,
            force3D: true,
            clearProps: "opacity",
          },
          "-=0.35",
        );
      };

      unsubscribe = useIntroStore.subscribe((s) => {
        if (s.ready) play();
      });
      if (useIntroStore.getState().ready) play();
      else timeout = window.setTimeout(() => setReady(), READY_TIMEOUT_MS);
    });

    return () => {
      unsubscribe();
      window.clearTimeout(timeout);
      ctx.revert();
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      // z-90: above header (z-30) and hero, below the cream frame (z-100).
      className="pointer-events-none fixed inset-0 z-[90] bg-cream"
      style={{ willChange: "transform" }}
    />
  );
}
