"use client";

import { CyclingWord } from "@/components/home/CyclingWord";

export function Hero() {
  // The intro reveal (eyebrow + headline flying up) is driven centrally by
  // IntroSequence, which targets the [data-intro] elements below — it sequences
  // them after the cream wipe and the header, so the animation can't live here.
  return (
    <section
      // Picked up by the header's scroll-spy, which lights the wordmark while
      // the hero holds the viewport's center — the same rule the section links
      // follow. Not an `id`, because this isn't a routable section.
      data-hero
      // 100svh, not 100dvh: dvh re-resolves throughout iOS Safari's toolbar
      // animation, so the hero (and with it the document height and this
      // mix-blend-difference group) relayouts on every frame of the scroll.
      // svh is static — it fills the screen with the chrome shown.
      className="relative z-10 flex min-h-[100svh] flex-col justify-center gutter-x mix-blend-difference"
    >
      <div className="max-w-200">
        <div
          data-intro="eyebrow"
          className="inline-block font-mono text-xs uppercase tracking-[0.3em] text-white/80"
        >
          Portfolio 2026
        </div>

        <h1
          data-intro="headline"
          // text-balance and -webkit-font-smoothing: antialiased both break
          // mix-blend-difference on large text in iOS Safari. Drop the former
          // and override the latter for this blended element.
          style={{ WebkitFontSmoothing: "auto" }}
          className="mt-2 -ml-[4px] text-3xl md:text-5xl lg:text-7xl font-semibold leading-[1.2] tracking-tight"
        >
          Digital Product <CyclingWord />
          <br />
          for the Agentic Era
        </h1>
      </div>
    </section>
  );
}
