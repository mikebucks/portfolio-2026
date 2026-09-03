"use client";

import { CyclingWord } from "@/components/home/CyclingWord";

export function Hero() {
  // The intro reveal (eyebrow + headline + keys flying up) is driven centrally
  // by IntroSequence, which targets the [data-intro] elements below — it
  // sequences them after the cream wipe and the header, so the animation can't
  // live here.
  return (
    <section
      // No id: the hero isn't a routable section — it's what `/` means, and the
      // header lights the wordmark off that path rather than off this element.
      // 100svh, not 100dvh: dvh re-resolves throughout iOS Safari's toolbar
      // animation, so the hero (and with it the document height and the
      // mix-blend-difference group below) relayouts on every frame of the
      // scroll. svh is static — it fills the screen with the chrome shown.
      //
      // mix-blend-difference used to sit here, on the section; it moved down to
      // the headline wrapper when the synth keys arrived, because difference
      // would smear the caps' palette colours against the shader. That also
      // means this section must NOT open a stacking context (no z-index,
      // transform, opacity) — a stacking context is an isolated group, and the
      // headline's blend would stop at it instead of reaching the shader.
      className="flex min-h-[100svh] flex-col justify-center gutter-x"
    >
      {/* Centering column. The headline block is only 800px, but it has to
          start at the same left edge as every other section's content, so it
          hangs off a 1600px column that centers past that width rather than
          off the gutter itself. */}
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="max-w-200">
          {/* Only the type blends — see the section note. */}
          <div className="relative z-10 mix-blend-difference">
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
              //
              // Sized to the viewport, not to breakpoints: the widest line the
              // slot can show ("Digital Product Designer", in Inter 600 at
              // tracking-tighter) measures 10.52em, so 90vw / 10.52 makes that
              // line span 90% of the viewport — capped at the layout's 1600px
              // column, the same ceiling the centering div above hits, so the
              // headline stops growing where the rest of the page does. Sizing
              // to the widest word rather than the current one is what keeps
              // the headline from re-scaling on each roll. nowrap, because the
              // 800px column above would otherwise fold the line. Re-measure
              // the ratio if the font, weight or tracking changes.
              style={{ WebkitFontSmoothing: "auto" }}
              className="mt-2 -ml-[4px] whitespace-nowrap text-[length:calc(min(85vw,1600px)/10.52)] font-semibold leading-[1.15] tracking-tighter"
            >
              Digital Product <CyclingWord />
            </h1>
          </div>
        </div>
      </div>
    </section>
  );
}
