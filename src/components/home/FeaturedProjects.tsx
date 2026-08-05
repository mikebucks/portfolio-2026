"use client";

import type { MouseEvent } from "react";
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
      className="relative z-10 gutter-x bg-white/70 backdrop-blur-md"
    >
      {/* The centering column. Past 1600px the gutters stop growing and this
          takes over, so the heading, the card row and the all-projects list all
          center as one block instead of hugging the left rail. The card row
          below bleeds out of this box, not out of the section, which is what
          keeps its overhang symmetric on a widescreen. */}
      <div className="mx-auto max-w-[1600px]">

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
      <ul className="grid md:grid-cols-2 -mx-[var(--gutter)] max-w-[calc(1600px+var(--gutter)*2)]">
        {featured.map((p) => (
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
            className="relative z-0 overflow-hidden ring-0 ring-cream/0 transition-[border-radius,box-shadow] duration-300 ease-[cubic-bezier(0.05,0,0,1)] hover:z-10 hover:ring-[10px] hover:ring-cream hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.55),0_14px_32px_-12px_rgba(0,0,0,0.45)]"
          >
            <a
              href={projectPath(p.slug)}
              onClick={(e) => onCardClick(e, p.slug)}
              className="group relative block aspect-[16/13] xl:aspect-[16/11] bg-white/5"
            >
              {p.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.thumbnail}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.05,0,0,1)] group-hover:scale-[1.05]"
                />
              )}

              {/* Scrim — compressed to the lower half so the art stays
                  visible up top, staying dark down low for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black from-0% via-black/60 via-25% to-transparent to-75%" />

              {/* Content */}
              <div className="relative h-full p-8 flex flex-col gap-2 justify-end">
                <div className="text-2xl font-semibold text-white leading-tight tracking-tight">
                  {p.title}
                </div>
                <div className="text-sm text-white/80 leading-snug">
                  {p.summary}
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>

        <AllProjects />
      </div>
    </section>
  );
}
