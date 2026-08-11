import { ArrowUpRight } from "lucide-react";
import { SOCIALS } from "@/data/socials";
import { SynthKeyCap } from "@/components/audio/SynthKeyCap";
import { BucksUnltd, Sigil } from "@/components/icons";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    // The bottom padding is load-bearing for more than the footer: the synth
    // toggle is a fixed element that parks itself on this exact inset (see
    // SynthToggleButton), so at full scroll it lands on the marks row below.
    // Change it here and change it there. The safe-area term keeps the last row
    // clear of the home indicator and the floating address bar on iOS
    // (viewport-fit=cover); the fixed cream frame bar is inset+10px, so this
    // 2.5rem sits comfortably above it.
    <footer
      data-modal-hide
      style={{
        paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom, 0px))",
      }}
      className="relative z-10 gutter-x pt-10 bg-ink"
    >
      <div className="mx-auto flex max-w-[1600px] flex-col gap-8">
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs">
          {SOCIALS.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-1 text-white/90 underline decoration-white/20 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
              >
                {s.label}
                <ArrowUpRight
                  size={14}
                  strokeWidth={1.5}
                  className="text-white/40 transition-colors group-hover:text-accent"
                />
              </a>
            </li>
          ))}
        </ul>

        {/* items-end, not center: the marks sit on the same baseline as the
            last line of copy, and that shared bottom edge is what the synth
            toggle lines up against. Centering would float them by half the
            difference in height, which changes whenever the copyright wraps.

            Wrapping, not a breakpoint. The marks only need their own line when
            the copy beside them genuinely runs out of room, and that depends on
            how long the copy is — not on the viewport. Gated on `md` instead,
            they drop a line at 700px while the column still has 300px spare,
            which reads as broken next to copy that has *also* stacked: two
            things wrapping where nothing had to. flex-wrap moves them only on
            the width where they'd otherwise overflow.

            `ml-auto` rather than justify-between because it survives the wrap —
            justify-between puts a lone item on the second line at its start, so
            the marks would jump to the left edge exactly when they wrap and
            leave the toggle stranded on the right. */}
        <div className="flex flex-wrap items-end gap-x-4 gap-y-6">
          <div className="flex flex-col gap-2 font-mono text-xs text-white/60 md:flex-row md:items-center">
            <span className="inline-flex items-center gap-1">
              {["a", "s", "d", "f"].map((k) => (
                <SynthKeyCap key={k} keyName={k} />
              ))}
              <span className="ml-1">makes me dance</span>
            </span>
            <span> · built with humanity &copy; {year}</span>
          </div>

          {/* The other two marks. The trailing 40px hole is the synth toggle's:
              it's fixed to the viewport but laid out on this same content
              column, so at full scroll it lands in the gap and the three read
              as one set. See SynthToggleButton.

              Decorative — the seal is the only control. pointer-events off so
              the hole can't shadow its hit area. shrink-0 so a narrow viewport
              squeezes the copy rather than the marks. */}
          <div
            aria-hidden
            className="pointer-events-none ml-auto flex shrink-0 items-center"
          >
            {/* No `plate`: these read as bare white marks straight on the ink,
                rather than as chips. The seal is the exception — it paints its
                own, because it animates that chip to black when the panel
                opens. */}
            <BucksUnltd size={40} className="text-white" />
            <Sigil size={40} className="text-white" />
            <span className="ml-3 h-10 w-10" />
          </div>
        </div>
      </div>
    </footer>
  );
}
