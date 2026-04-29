"use client";

import { useGsapIntro } from "@/components/animation/useGsapIntro";
import { useSynthControls } from "@/components/audio/useSynthControls";
import { InlineHighlight } from "@/components/ui/InlineHighlight";

export function Hero() {
  const rootRef = useGsapIntro<HTMLElement>();
  useSynthControls();

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
          Design · Engineering · 2026
        </div>

        <h1
          data-intro="headline"
          className="mt-2 text-4xl md:text-5xl lg:text-7xl font-semibold leading-[1.2] tracking-tight text-balance"
        >
          Digital Product Builder for the Agentic Era
        </h1>
      </div>
      {/* <div
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
      </div> */}
    </section>
  );
}
