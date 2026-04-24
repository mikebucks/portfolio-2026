"use client";

import { useGsapIntro } from "@/components/animation/useGsapIntro";
import { useSynthControls } from "@/components/audio/useSynthControls";

export function Hero() {
  const rootRef = useGsapIntro<HTMLElement>();
  useSynthControls();

  return (
    <section
      ref={rootRef}
      className="relative z-10 flex min-h-[100dvh] flex-col justify-between px-6 pt-32 pb-16 md:px-10"
    >
      <div className="max-w-3xl">
        <div
          data-intro="eyebrow"
          className="font-mono text-xs uppercase tracking-[0.3em] text-white/60"
        >
          Design · Engineering · 2026
        </div>

        <h1
          data-intro="headline"
          className="mt-6 text-5xl md:text-7xl lg:text-8xl font-semibold leading-[0.95] tracking-tight"
        >
          Interfaces,
          <br />
          systems, and the
          <br />
          <span className="text-accent">occasional instrument.</span>
        </h1>

        <p
          data-intro="lede"
          className="mt-8 max-w-xl text-lg leading-relaxed text-white/80"
        >
          A small practice focused on product design and creative technology.
          Shipping thoughtful systems for teams that care about craft.
        </p>
      </div>

      <div
        data-intro="meta"
        className="mt-16 flex flex-wrap items-end justify-between gap-6 font-mono text-xs text-white/60"
      >
        <div>
          <div className="uppercase tracking-widest">Now</div>
          <div className="mt-1 text-white/80">
            Independent — open to selective collaborations.
          </div>
        </div>
        <div className="text-right">
          <div className="uppercase tracking-widest">Try</div>
          <div className="mt-1 text-white/80">
            A S D F G H J K L ;
          </div>
        </div>
      </div>
    </section>
  );
}
