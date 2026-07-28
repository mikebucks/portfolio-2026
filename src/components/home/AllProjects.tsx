"use client";

import { useLayoutEffect, useRef, type MouseEvent } from "react";
import gsap from "gsap";
import { otherProjects, projectImages } from "@/data/projects";
import { prefersReducedMotion } from "@/lib/device";
import { setProjectOrigin } from "@/lib/projectTransition";

// Menu-to-grid hover, adapted from the Codrops "Menu to Grid" interaction:
// hovering a row slides a strip of preview thumbnails in from the right
// (staggered, right-most first). Clicking blooms the strip and hands off to the
// project modal, whose cream cover grows out of the clicked row (see
// projectTransition).
const REVEAL = { duration: 0.4 } as const;

/**
 * Full project index, rendered on the light "Recently shipped" panel below the
 * featured cards. Excludes the featured projects (they live in the cards above)
 * and deep-links each row into the hash-routed project modal.
 */
export function AllProjects() {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (prefersReducedMotion()) return; // CSS handles a plain hover fallback.

    const cleanups: Array<() => void> = [];
    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>("[data-row]").forEach((row) => {
        const imgs = row.querySelectorAll<HTMLElement>("[data-img]");

        // Committed rest state: strip hidden + nudged right.
        gsap.set(imgs, { opacity: 0, scale: 0.8, xPercent: 20 });

        const enter = () => {
          gsap.to(imgs, {
            opacity: 1,
            scale: 1,
            xPercent: 0,
            ease: "power3",
            stagger: -0.035, // right-most thumbnail leads
            overwrite: true,
            ...REVEAL,
          });
        };
        const leave = () => {
          gsap.to(imgs, {
            opacity: 0,
            scale: 0.8,
            xPercent: 20,
            ease: "power4",
            overwrite: true,
            ...REVEAL,
          });
        };

        row.addEventListener("mouseenter", enter);
        row.addEventListener("mouseleave", leave);
        cleanups.push(() => {
          row.removeEventListener("mouseenter", enter);
          row.removeEventListener("mouseleave", leave);
        });
      });
    }, root);

    return () => {
      cleanups.forEach((fn) => fn());
      ctx.revert();
    };
  }, []);

  function onRowClick(e: MouseEvent<HTMLAnchorElement>, slug: string) {
    // Let modified clicks (new tab, etc.) and reduced-motion users use the
    // plain anchor; the modal still opens via the hash, just without the grow.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (prefersReducedMotion()) return;

    e.preventDefault();
    const row = e.currentTarget;
    const rect = row.getBoundingClientRect();
    setProjectOrigin({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });

    // Bloom the revealed strip as the cream cover is about to rise over it.
    gsap.to(row.querySelectorAll("[data-img]"), {
      scale: 1.15,
      opacity: 0,
      duration: 0.5,
      ease: "power3",
      overwrite: true,
    });

    // Let the bloom read for a beat, then open the modal (its cover grows from `rect`).
    window.setTimeout(() => {
      window.location.hash = `projects/${slug}`;
    }, 150);
  }

  return (
    <div ref={rootRef} className="max-w-[1600px] pb-20">
      <h2 className="mb-6 font-mono text-xs uppercase tracking-widest text-black/60">
        All projects
      </h2>
      <ul className="divide-y divide-black/10 border-y border-black/10">
        {otherProjects.map((p) => {
          const images = projectImages(p);

          // No case study yet: the row is inert (plain <div>, no hover strip)
          // and wears a badge instead of linking into the modal.
          if (p.comingSoon) {
            return (
              <li key={p.slug}>
                <div className="flex items-center gap-6 py-6">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xl md:text-2xl font-medium text-black/70">
                      {p.title}
                    </div>
                    <div className="mt-1 truncate text-sm text-black/50">
                      {p.summary}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-accent/35 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-accent">
                    Coming soon
                  </span>
                </div>
              </li>
            );
          }

          return (
            <li key={p.slug}>
              <a
                data-row
                href={`/#projects/${p.slug}`}
                onClick={(e) => onRowClick(e, p.slug)}
                className="group flex items-center gap-6 py-6 transition-colors hover:bg-black/[0.02]"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xl md:text-2xl font-medium text-black">
                    {p.title}
                  </div>
                  <div className="mt-1 truncate text-sm text-black/60">
                    {p.summary}
                  </div>
                </div>

                {/* Preview strip. Only shown on hover-capable devices (mouse) so
                    touch users get full-width, legible copy instead of an empty
                    reserved column. GSAP reveals it on hover for motion users,
                    `group-hover` does for reduced-motion users. */}
                <span
                  aria-hidden
                  className="pointer-events-none hidden shrink-0 items-center justify-end gap-2 [@media(hover:hover)]:flex"
                >
                  {images.map((src, i) => (
                    <span
                      key={i}
                      data-img
                      className="block aspect-square w-11 shrink-0 rounded bg-black/5 bg-cover bg-center opacity-0 motion-reduce:transition-opacity motion-reduce:duration-300 motion-reduce:group-hover:opacity-100 md:w-14"
                      style={{ backgroundImage: `url(${src})` }}
                    />
                  ))}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
