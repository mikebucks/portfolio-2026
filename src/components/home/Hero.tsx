"use client";

import { CyclingWord } from "@/components/home/CyclingWord";

export function Hero() {
  return (
    <section
      className="flex min-h-[100svh] flex-col justify-center gutter-x"
    >
      <div className="mx-auto w-full max-w-[1600px] -mt-11">
        <div className="max-w-200">
          <div className="relative z-10 mix-blend-difference">
            <div
              data-intro="eyebrow"
              className="inline-block font-mono text-xs uppercase tracking-[0.3em] text-white/80"
            >
              Portfolio 2026
            </div>

            <h1
              data-intro="headline"
              style={{ WebkitFontSmoothing: "auto" }}
              className="-ml-[4px] whitespace-nowrap text-[length:calc(min(80vw,1600px)/10.52)] font-semibold leading-[1.15] tracking-tighter"
            >
              Digital Product <CyclingWord />
            </h1>
          </div>
        </div>
      </div>
    </section>
  );
}
