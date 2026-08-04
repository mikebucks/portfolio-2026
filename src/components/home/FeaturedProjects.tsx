"use client";

import type { MouseEvent } from "react";
import { ArrowRight } from "lucide-react";
import { featuredProjects } from "@/data/projects";
import { prefersReducedMotion } from "@/lib/device";
import { captureProjectOrigin } from "@/lib/projectTransition";
import { navigate, projectPath } from "@/lib/appRoute";
import { AllProjects } from "./AllProjects";

export function FeaturedProjects() {
  const featured = featuredProjects;

  // Same hand-off the "All projects" rows use: stash the clicked card's rect so
  // the modal's cream cover grows out of the thumbnail rather than playing the
  // default frame-expand. See projectTransition + ProjectModal.
  function onCardClick(e: MouseEvent<HTMLAnchorElement>, slug: string) {
    // Modified clicks (new tab, etc.) and reduced-motion users keep the plain
    // anchor — /projects/<slug> serves the same page with the modal open, just
    // without the grow.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (prefersReducedMotion()) return;

    e.preventDefault();
    captureProjectOrigin(e.currentTarget);
    navigate(projectPath(slug));
  }

  return (
    <section
      id="projects"
      className="relative z-10 gutter-x pt-20 bg-white/70 backdrop-blur-md"
    >
      <div className="flex items-baseline justify-between w-full max-w-[1600px]">
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-black/80">
          Recently shipped
        </h2>
      </div>

      {/* Full bleed: the row escapes the section's gutters with a negative
          margin of exactly the same width (--gutter, published by gutter-x), so
          its border box is the body's and the thumbnails run edge to edge, under
          the fixed cream rails. Negative margins rather than 100vw — the page
          reserves a scrollbar gutter (`scrollbar-gutter: stable` on html), which
          100vw includes and would push out as horizontal overflow.

          The max-width carries the same two gutters: it caps the element's own
          box, which now starts a gutter further left than the 1600px column
          above it, so a bare 1600px would measure the wrong column — the row
          would sit a gutter to the left of the heading and stop a gutter short
          of it on the right. Adding both back makes the cap the 1600px column
          plus its bleed on each side, so the row grows out of that column
          symmetrically instead of being offset by it. */}
      <ul className="grid md:grid-cols-3 -mx-[var(--gutter)] max-w-[calc(1600px+var(--gutter)*2)] pt-8 pb-16">
        {featured.map((p) => {
          // No case study yet: the card keeps its art but doesn't link — the
          // "Read →" affordance becomes a "Coming soon" badge, and the hover
          // zoom / ring lift are dropped so it reads as inert.
          // An <a> with no href is inert: not clickable, not tabbable, no
          // pointer cursor — so the coming-soon card keeps identical layout
          // without pretending to be a link.
          return (
            <li
              key={p.slug}
              // The hovered card lifts above its neighbours so its cream ring —
              // drawn 10px outside its own box, over whatever is next to it —
              // isn't painted over by the card that follows it in the DOM. The
              // lift is instant either way: z-index is out of the transition
              // list, so only the ring and the shadow animate.
              //
              // Ring and shadow are one property: Tailwind composes both into
              // box-shadow, so the drop shadow rides the transition already
              // named there. It's deep and far-thrown on purpose — the row is
              // edge to edge now, and the shadow is the only thing separating a
              // raised card from the two still lying flat beside it.
              className={
                p.comingSoon
                  ? "overflow-hidden"
                  : "relative z-0 overflow-hidden ring-0 ring-cream/0 transition-[border-radius,box-shadow] duration-300 ease-[cubic-bezier(0.05,0,0,1)] hover:z-10 hover:ring-[10px] hover:ring-cream hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.55),0_14px_32px_-12px_rgba(0,0,0,0.45)]"
              }
            >
              <a
                {...(p.comingSoon
                  ? {}
                  : {
                      href: projectPath(p.slug),
                      onClick: (e: MouseEvent<HTMLAnchorElement>) =>
                        onCardClick(e, p.slug),
                    })}
                className="group relative block aspect-[16/10] bg-white/5"
              >
                {p.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumbnail}
                    alt=""
                    className={`absolute inset-0 h-full w-full object-cover ${
                      p.comingSoon
                        ? ""
                        : "transition-transform duration-700 ease-[cubic-bezier(0.05,0,0,1)] group-hover:scale-[1.05]"
                    }`}
                  />
                )}

                {/* Scrim — compressed to the lower half so the art stays
                    visible up top, staying dark down low for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black from-0% via-black/60 via-25% to-transparent to-75%" />

                {/* Content */}
                <div className="relative h-full p-8 pb-4 flex flex-col justify-end">
                  <div className="text-xl font-semibold text-white leading-tight tracking-tight">
                    {p.title}
                  </div>
                  <div className="text-sm text-white/60 leading-snug">
                    {p.summary}
                  </div>
                  {p.comingSoon ? (
                    <div className="mt-2 self-start rounded-full border border-accent/50 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-accent">
                      Coming soon
                    </div>
                  ) : (
                    <div className="mt-2 font-mono text-xs text-white/40 group-hover:text-accent transition-colors duration-150 inline-flex items-center gap-1">
                      Read <ArrowRight size={11} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
              </a>
            </li>
          );
        })}
      </ul>

      <AllProjects />
    </section>
  );
}
