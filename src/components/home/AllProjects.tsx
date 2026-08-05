"use client";

import { useLayoutEffect, useRef, type MouseEvent } from "react";
import gsap from "gsap";
import { otherProjects, projectImages } from "@/data/projects";
import { prefersReducedMotion } from "@/lib/device";
import { captureProjectOrigin } from "@/lib/projectTransition";
import { navigate, projectPath } from "@/lib/appRoute";

// Menu-to-grid hover, adapted from the Codrops "Menu to Grid" interaction:
// hovering a row slides a strip of preview thumbnails in from the right
// (staggered, right-most first). Clicking blooms the strip and hands off to the
// project modal, whose cream cover grows out of the clicked row (see
// projectTransition).
const REVEAL = { duration: 0.4 } as const;

/**
 * Full project index, rendered on the light "Recently shipped" panel below the
 * featured cards. Excludes the featured projects (they live in the cards above)
 * and deep-links each row into the project modal at /projects/<slug>.
 */
export function AllProjects() {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Reduced-motion users skip the GSAP reveal (CSS group-hover handles it),
    // but they still need the lazy image loader below, so this no longer
    // early-returns — the reveal wiring is what's gated, not the whole effect.
    const reduced = prefersReducedMotion();

    const cleanups: Array<() => void> = [];
    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>("[data-row]").forEach((row) => {
        const imgs = row.querySelectorAll<HTMLElement>("[data-img]");

        // Lazy-load the preview thumbnails on first hover or keyboard focus.
        // The URLs live in data-src until then, so a cold visit never fetches
        // previews for rows the user never engages. Assigned once, then the
        // listeners detach themselves.
        const loadImages = () => {
          imgs.forEach((el) => {
            const src = el.dataset.src;
            if (src) el.style.backgroundImage = `url(${src})`;
          });
          row.removeEventListener("mouseenter", loadImages);
          row.removeEventListener("focusin", loadImages);
        };
        row.addEventListener("mouseenter", loadImages);
        row.addEventListener("focusin", loadImages);
        cleanups.push(() => {
          row.removeEventListener("mouseenter", loadImages);
          row.removeEventListener("focusin", loadImages);
        });

        // Reduced-motion users get the CSS group-hover fallback; the sliding
        // GSAP reveal (and its rest-state set) is motion-users only.
        if (reduced) return;

        // Committed rest state: strip hidden + nudged right.
        gsap.set(imgs, { opacity: 0, scale: 0.8, xPercent: 20 });

        // The wash wipes rather than fades: down from the top edge on the way
        // in, and — still travelling down — out through the bottom edge on the
        // way out. Both halves are one origin-at-top transform, `scaleY` for
        // the height and `yPercent` for where the band sits:
        //
        //   top = yPercent × H     height = scaleY × H
        //
        // In: yPercent 0, scaleY 0 → 1. Top pinned, bottom edge runs down.
        // Out: yPercent 0 → 1 while scaleY 1 → 0. Because both ride the same
        // eased progress their sum is 1 at every frame, so the BOTTOM edge is
        // pinned at H and the top edge chases it down. That's what keeps the
        // exit inside the row: a naive scaleY-with-origin-swap would jump on a
        // fast mouse-out, and translating a collapsing band any further would
        // drag cream across the row below (the wrapper only clips the x-axis).
        //
        // opacity 1 here is the handoff from the CSS `opacity-0` start; from now
        // on the height alone decides whether the wash is visible.
        const wash = row.querySelector<HTMLElement>("[data-wash]");
        gsap.set(wash, {
          opacity: 1,
          scaleY: 0,
          yPercent: 0,
          transformOrigin: "50% 0%",
        });

        const enter = () => {
          // Re-arm at the top, but only from a standing start. Mid-flight the
          // band is somewhere in the middle of its exit, and snapping it back to
          // the top edge to regrow would read as a flicker — tweening the
          // partial band straight back to full height reverses the gesture
          // instead, which is what a quick out-and-back should look like.
          if ((gsap.getProperty(wash, "scaleY") as number) < 0.001) {
            gsap.set(wash, { yPercent: 0 });
          }
          gsap.to(wash, {
            scaleY: 1,
            yPercent: 0,
            ease: "power3",
            overwrite: true,
            ...REVEAL,
          });
          gsap.to(imgs, {
            opacity: 1,
            scale: 1,
            xPercent: 0,
            ease: "power3",
            stagger: -0.05, // right-most thumbnail leads
            overwrite: true,
            ...REVEAL,
          });
        };
        const leave = () => {
          gsap.to(wash, {
            scaleY: 0,
            yPercent: 100,
            ease: "power4",
            overwrite: true,
            ...REVEAL,
          });
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
    // plain anchor; /projects/<slug> serves the same page with the modal open,
    // just without the grow.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (prefersReducedMotion()) return;

    e.preventDefault();
    const row = e.currentTarget;
    captureProjectOrigin(row);

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
      navigate(projectPath(slug));
    }, 150);
  }

  return (
    // No width cap of its own — it renders inside the featured section's
    // centering column, which already owns the 1600px measure.
    //
    // The negative margin + matching padding cancel out: rows still measure the
    // centering column, but this box's border edge is now a gutter wider on each
    // side, which is exactly how far the cream wash and the preview strip reach.
    // That makes it the right place to clip. It has to clip, because the strip's
    // rest state parks the thumbnails 20% of their width to the RIGHT of a strip
    // that now ends at the page edge — with nothing clipping the x-axis (html
    // only sets overflow-y), that overhang would show up as a horizontal
    // scrollbar on every cold load. `clip` rather than `hidden` so the y-axis
    // stays truly visible instead of silently becoming a scroll container.
    <div ref={rootRef} className="pb-6 -mx-[var(--gutter)] px-[var(--gutter)] overflow-x-clip">
      <ul>
        {otherProjects.map((p) => {
          const images = projectImages(p);

          return (
            <li key={p.slug}>
              <a
                data-row
                href={projectPath(p.slug)}
                onClick={(e) => onRowClick(e, p.slug)}
                className="group relative flex items-center gap-6"
              >
                {/* Cream wash. A real element rather than a ::before because
                    GSAP drives it (see the wipe in the effect above) and a
                    pseudo-element isn't addressable from script.

                    Out of flow, so the title and summary never move on hover,
                    and bled by exactly --gutter on each side — the same escape
                    the featured card row makes from the section's padding.

                    Starts `opacity-0` in CSS and is handed to GSAP as opacity 1
                    + zero height on mount: without the CSS start every row would
                    flash cream between paint and hydration. Reduced-motion users
                    never reach that handoff, so the opacity fade below is their
                    whole animation. */}
                <span
                  aria-hidden
                  data-wash
                  className="pointer-events-none absolute inset-y-0 -inset-x-[var(--gutter)] bg-cream opacity-0 motion-reduce:transition-opacity motion-reduce:duration-300 motion-reduce:group-hover:opacity-100"
                />

                {/* `relative` on everything the wash sits behind — it's
                    positioned, so it would otherwise paint over static siblings
                    regardless of DOM order. */}
                <div className="relative min-w-0 flex-1 flex flex-col gap-2 py-6">
                  <div className="truncate text-2xl font-semibold leading-tight tracking-tight text-black">
                    {p.title}
                  </div>
                  <div className="truncate text-sm text-black/80 leading-snug">
                    {p.summary}
                  </div>
                </div>

                {/* Preview strip. Only shown on hover-capable devices (mouse) so
                    touch users get full-width, legible copy instead of an empty
                    reserved column. GSAP reveals it on hover for motion users,
                    `group-hover` does for reduced-motion users.

                    The negative right margin eats the section's gutter so the
                    right-most thumbnail sits flush against the same edge the
                    cream wash reaches — the strip slides in off the page edge,
                    not off an invisible inset. Negative margin rather than a
                    transform: it shrinks the flex item's outer size too, so the
                    space goes back to the truncating title column instead of
                    overlapping it. */}
                <span
                  aria-hidden
                  className="pointer-events-none relative hidden shrink-0 items-center justify-end -mr-[var(--gutter)] [@media(hover:hover)]:flex"
                >
                  {images.map((src, i) => (
                    <span
                      key={i}
                      data-img
                      data-src={src}
                      className="block aspect-square w-14 shrink-0 bg-black/5 bg-cover bg-center opacity-0 motion-reduce:transition-opacity motion-reduce:duration-300 motion-reduce:group-hover:opacity-100 md:w-20 lg:w-30"
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
