import { ArrowUpRight } from "lucide-react";
import { SOCIALS } from "@/data/socials";
import { SynthKeyCap } from "@/components/audio/SynthKeyCap";
import { BucksUnltd, NoTrash, RecycleIC3, Sigil } from "@/components/icons";

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
        <div className="flex justify-between">
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
          <span className="font-mono text-xs text-white/60">Built with humanity</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-y-6">
          <div className="flex flex-col gap-2 font-mono text-xs text-white/60 md:flex-row md:items-center">
            <span className="inline-flex items-center gap-1">
              {["a", "s", "d", "f"].map((k) => (
                <SynthKeyCap key={k} keyName={k} />
              ))}
              <span className="ml-1">makes me dance</span>
            </span>
            <span> · &copy; {year}</span>
          </div>
          <div
            aria-hidden
            className="pointer-events-none ml-auto flex shrink-0 items-center text-neutral-400"
          >
            <BucksUnltd size={40} />
            <NoTrash size={40} />
            <Sigil size={40} />
            <RecycleIC3 size={40} />
            <span className="h-10 w-10 ml-1" />
          </div>
        </div>
      </div>
    </footer>
  );
}
