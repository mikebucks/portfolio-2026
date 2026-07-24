"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/device";
import { useIntroStore } from "@/lib/store";

// Full-load intro. The page starts fully covered by an opaque cream layer (this
// is server-rendered, so there is no flash of black or the loading shader). The
// moment the shader paints — `useIntroStore.ready` — a master timeline:
//
//   1. wipes the cream layer up and off the top, revealing the site from the
//      bottom upward, with the header and hero headline still hidden;
//   2. flies the global header down from the top;
//   3. flies the hero headline up (eyebrow + H1) and releases the word roll.
//
// It targets DOM the components can't hand us refs for: the global `<header>`
// (root layout) and the hero `[data-intro]` group (deep in the hero) are
// reached by selector; the cream overlay is this component's own element.

// Runs at most once per full page load. On a client-side re-entry to the home
// route the components remount but this stays true, so we skip straight to the
// rest state instead of replaying the cover-and-reveal.
let introHasRun = false;

// Safety net: if `ready` never fires (shader wedged, no first-frame callback),
// reveal anyway so the page can never get stranded under the cream.
const READY_TIMEOUT_MS = 3000;

export function IntroSequence() {
  const overlayRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const header = document.querySelector<HTMLElement>("[data-intro-header]");
    // Eyebrow + headline, in document order (stagger reveals eyebrow first).
    const headline = Array.from(
      document.querySelectorAll<HTMLElement>("[data-intro]"),
    );

    const { setReady, setHeadlinePlay } = useIntroStore.getState();

    // force3D leaves an inline translate3d on the headline so it stays on a GPU
    // compositing layer — required for mix-blend-difference against the shader
    // on iOS Safari. We deliberately never clear `transform`/`willChange` from
    // these elements; letting them persist is what keeps the H1 blending after
    // the intro, rather than dropping out until a scroll forces a recomposite.

    // Already played once this load, or reduced motion: skip to the rest state.
    if (introHasRun || prefersReducedMotion()) {
      gsap.set(overlay, { yPercent: -100, autoAlpha: 0 });
      if (header) gsap.set(header, { yPercent: 0, autoAlpha: 1 });
      gsap.set(headline, { opacity: 1, y: 0, force3D: true });
      setHeadlinePlay();
      introHasRun = true;
      return;
    }

    // Cleanup handles for the ready wait — cleared by the effect teardown so a
    // StrictMode double-invoke (or a real unmount) can't leak the subscription
    // or fire the timeout after we're gone.
    let unsubscribe = () => {};
    let timeout = 0;
    let played = false;

    const ctx = gsap.context(() => {
      // Resting-out states, applied before paint. The overlay already covers
      // the screen (its default CSS), so the header/headline being hidden here
      // is invisible — the cream is on top of them until the reveal.
      if (header) gsap.set(header, { yPercent: -110, autoAlpha: 0 });
      gsap.set(headline, { opacity: 0, y: 24, force3D: true });

      const play = () => {
        if (played) return;
        played = true;
        introHasRun = true;
        window.clearTimeout(timeout);
        unsubscribe();

        const tl = gsap.timeline();

        // 1. Cream wipes up and off the top — the site is revealed from the
        //    bottom upward, finishing at the top just as the header arrives.
        tl.to(overlay, {
          yPercent: -100,
          duration: 0.55,
          ease: "expo.out",
          delay: 0.15,
        });

        // 2. Header drops in from above, overlapping the tail of the wipe.
        if (header) {
          tl.to(
            header,
            { yPercent: 0, autoAlpha: 1, duration: .2, ease: "expo.outut", delay: 0.12 },
            "-=0.25",
          );
        }

        // 3. Headline flies up. Releasing the word roll here (rather than on
        //    mount) keeps CyclingWord in step with the headline appearing.
        tl.add(() => setHeadlinePlay(), "-=0.15");
        tl.to(
          headline,
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "expo.out",
            delay: 0.45,
            stagger: 0.18,
            force3D: true,
            // Clear only opacity — see the force3D note above for why transform
            // and willChange are left inline on the headline.
            clearProps: "opacity",
          },
          "-=0.35",
        );
      };

      unsubscribe = useIntroStore.subscribe((s) => {
        if (s.ready) play();
      });
      // Already ready (e.g. re-mount after the shader painted): go now.
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
      // Above the header (z-30) and hero (z-10) so it hides them during the
      // cover, below the cream frame bars (z-100) so the reveal reads as the
      // cream lifting off a continuous cream edge. Purely visual — never eats
      // pointer events, even while covering.
      className="pointer-events-none fixed inset-0 z-[90] bg-cream"
      style={{ willChange: "transform" }}
    />
  );
}
