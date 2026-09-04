import { ArrowUpRight } from "lucide-react";
import { SOCIALS } from "@/data/socials";
import { BucksUnltd, Sigil } from "@/components/icons";

export function Footer() {
  const year = new Date().getFullYear();
  return (
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
          <span className="font-mono text-xs text-white/60 text-right">Built with humanity</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-y-6">
          <div className="flex flex-row items-center font-mono text-xs text-white/60">
            
            <span>&copy; Mike Bucks {year} · </span>
            <div
              aria-hidden
              className="pointer-events-none ml-auto flex shrink-0 items-center text-neutral-400"
            >
            <BucksUnltd size={40} />
            <Sigil size={40} />
          </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
