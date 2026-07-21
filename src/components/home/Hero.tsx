"use client";

import { useGsapIntro } from "@/components/animation/useGsapIntro";
import { CyclingWord } from "@/components/home/CyclingWord";

export function Hero() {
  const rootRef = useGsapIntro<HTMLElement>();

  return (
    <section
      ref={rootRef}
      className="relative z-10 flex min-h-[100dvh] flex-col justify-center px-8 mix-blend-difference"
    >
      <div className="max-w-200">
        <div
          data-intro="eyebrow"
          className="font-mono text-xs uppercase tracking-[0.3em] text-white/80"
        >
          Portfolio 2026
        </div>

        <h1
          data-intro="headline"
          // text-balance and -webkit-font-smoothing: antialiased both break
          // mix-blend-difference on large text in iOS Safari. Drop the former
          // and override the latter for this blended element.
          style={{ WebkitFontSmoothing: "auto" }}
          className="mt-2 -ml-[4px] text-4xl md:text-5xl lg:text-7xl font-semibold leading-[1.2] tracking-tight"
        >
          Digital Product <CyclingWord />
          <br />
          for the Agentic Era
        </h1>
      </div>
    </section>
  );
}
