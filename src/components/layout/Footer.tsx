import { ArrowUpRight } from "lucide-react";
import { SOCIALS, CONTACT_EMAIL } from "@/data/socials";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    // Extra bottom padding for the home-indicator safe area (viewport-fit=cover),
    // so the last row clears the floating address bar. The footer is already
    // cream, so the fixed cream bottom frame bar overlaps it invisibly.
    <footer
      style={{
        paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom, 0px))",
      }}
      className="relative z-10 gutter-x pt-10 bg-cream"
    >
      <div className="mx-auto flex max-w-[1600px] flex-col gap-8">
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs">
          <li>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="group inline-flex items-center gap-1 text-black/90 underline decoration-black/20 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
            >
              {CONTACT_EMAIL}
            </a>
          </li>
          {SOCIALS.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-1 text-black/90 underline decoration-black/20 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
              >
                {s.label}
                <ArrowUpRight
                  size={14}
                  strokeWidth={1.5}
                  className="text-black/40 transition-colors group-hover:text-accent"
                />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-start justify-between gap-4 font-mono text-xs text-black/60 md:flex-row md:items-center">
          <span>&copy; {year} · built with humanity</span>
          <span>
            Press{" "}
            <kbd className="rounded border border-black/15 px-1.5 py-0.5">
              A
            </kbd>{" "}
            <kbd className="rounded border border-black/15 px-1.5 py-0.5">
              S
            </kbd>{" "}
            <kbd className="rounded border border-black/15 px-1.5 py-0.5">
              D
            </kbd>{" "}
            <kbd className="rounded border border-black/15 px-1.5 py-0.5">
              F
            </kbd>{" "}
            make me dance
          </span>
        </div>
      </div>
    </footer>
  );
}
