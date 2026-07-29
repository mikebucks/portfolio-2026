"use client";

import type { MouseEvent } from "react";
import { ArrowRight } from "lucide-react";
import { featuredProjects } from "@/data/projects";
import { prefersReducedMotion } from "@/lib/device";
import { setProjectOrigin } from "@/lib/projectTransition";
import { AllProjects } from "./AllProjects";

export function FeaturedProjects() {
  const featured = featuredProjects;

  // Same hand-off the "All projects" rows use: stash the clicked card's rect so
  // the modal's cream cover grows out of the thumbnail rather than playing the
  // default frame-expand. See projectTransition + ProjectModal.
  function onCardClick(e: MouseEvent<HTMLAnchorElement>, slug: string) {
    // Modified clicks (new tab, etc.) and reduced-motion users keep the plain
    // anchor — the modal still opens via the hash, just without the grow.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (prefersReducedMotion()) return;

    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setProjectOrigin({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
    window.location.hash = `projects/${slug}`;
  }

  return (
    <section
      id="projects"
      className="relative z-10 gutter-x pt-8 bg-white/70 backdrop-blur-md"
    >
      <div className="flex items-baseline justify-between w-full max-w-[1600px]">
        <h2 className="text-2xl md:text-3xl font-semibold text-black tracking-tight">
          Recently shipped
        </h2>
      </div>

      <ul className="grid gap-4 md:grid-cols-3 max-w-[1600px] pt-8 pb-16">
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
              className={
                p.comingSoon
                  ? "overflow-hidden rounded-xs"
                  : "overflow-hidden rounded-xs ring-0 ring-cream/0 transition-[border-radius,box-shadow] duration-300 ease-[cubic-bezier(0.05,0,0,1)] hover:rounded-sm hover:ring-[8px] hover:ring-cream/70"
              }
            >
              <a
                {...(p.comingSoon
                  ? {}
                  : {
                      href: `/#projects/${p.slug}`,
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
                        ? "opacity-85 saturate-75"
                        : "transition-transform duration-700 ease-[cubic-bezier(0.05,0,0,1)] group-hover:scale-[1.1]"
                    }`}
                  />
                )}

                {/* Scrim — compressed to the lower half so the art stays
                    visible up top, staying dark down low for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 from-0% via-black/60 via-25% to-transparent to-55%" />

                {/* Content */}
                <div className="relative h-full p-5 flex flex-col justify-end">
                  <div className="text-xl font-semibold text-white leading-tight tracking-tight">
                    {p.title}
                  </div>
                  <div className="mt-1.5 text-sm text-white/60 leading-snug">
                    {p.summary}
                  </div>
                  {p.comingSoon ? (
                    <div className="mt-1.5 self-start rounded-full border border-accent/50 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-accent">
                      Coming soon
                    </div>
                  ) : (
                    <div className="mt-1.5 font-mono text-xs text-white/40 group-hover:text-accent transition-colors duration-150 inline-flex items-center gap-1">
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
