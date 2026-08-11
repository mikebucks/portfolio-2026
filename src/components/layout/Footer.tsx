import { ArrowUpRight } from "lucide-react";
import { SOCIALS } from "@/data/socials";
import { SynthKeyCap } from "@/components/audio/SynthKeyCap";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    // Extra bottom padding for the home-indicator safe area (viewport-fit=cover),
    // so the last row clears the floating address bar. The footer is already
    // cream, so the fixed cream bottom frame bar overlaps it invisibly.
    <footer
      // Fades out behind the translucent project modal — see globals.css.
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

        <div className="flex flex-col gap-2 font-mono text-xs text-white/60 md:flex-row md:items-center">
          <span className="inline-flex items-center gap-1">
            {["a", "s", "d", "f"].map((k) => (
              <SynthKeyCap key={k} keyName={k} />
            ))}
            <span className="ml-1">makes me dance</span>
          </span>
          <span> · &copy; {year} · built with humanity</span>
        </div>
      </div>
    </footer>
  );
}
