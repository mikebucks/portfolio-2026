import type { ReactNode } from "react";
import { InteractiveBackground } from "@/components/home/InteractiveBackground";

/**
 * Shared page header for non-home pages: the interactive shader as a bounded
 * banner with the page title (and optional eyebrow / sub-content) overlaid.
 *
 * The copy has no background fill — it uses `mix-blend-difference` to stay
 * legible against the shifting shader, matching the home hero. The banner is a
 * positioned, isolated stacking context so the shader (z-0) sits behind the
 * copy (z-10) and the blend resolves against it.
 */
export function PageHeader({
  title,
  eyebrow,
  children,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="relative isolate flex min-h-[52vh] flex-col justify-end overflow-hidden">
      <InteractiveBackground variant="header" />
      <div className="relative z-10 flex w-full max-w-[1600px] flex-col px-8 pb-12 mix-blend-difference">
        {eyebrow ? <div className="mb-4">{eyebrow}</div> : null}
        <h1
          // mix-blend-difference breaks with subpixel AA on large text in iOS
          // Safari — force auto smoothing, same as the hero headline.
          style={{ WebkitFontSmoothing: "auto" }}
          className="text-4xl md:text-6xl font-semibold tracking-tight text-white"
        >
          {title}
        </h1>
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </header>
  );
}
