"use client";

import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type MouseEvent,
} from "react";
import gsap from "gsap";
import { projects, projectImages } from "@/data/projects";
import { prefersReducedMotion } from "@/lib/device";
import { navigate, projectPath } from "@/lib/appRoute";
import { useScrollReveal } from "@/components/animation/useScrollReveal";
import { headerOffset } from "@/components/animation/lenisInstance";

const HOVER_SCALE = 1.05;
const PARALLAX_MAX_PCT = 1.5;

// Scroll-driven card scale. A card is full size and square-cornered once its
// top edge reaches the finish line — a third of the way down the viewport
// below the header — and stays that way above it; the further below the line
// it sits, the smaller and rounder it is. Progress is 0 at the finish line and
// 1 at the viewport's bottom edge, both figures below scale linearly with it.
// The radius is written in the card's own (unscaled) pixels, so what's SEEN is
// radius × scale — at the bottom, 91 × 0.7 ≈ 64px on the card's shrunken box.
const SCROLL_FINISH = 0.33; // fraction of the viewport (below the header)
const SCROLL_SCALE_RANGE = 0.3; // 1 at the finish line → 0.7 at the bottom
const SCROLL_RADIUS_MAX = 91; // px, unscaled

const ROLL = 0.35; // one line's travel through its slot
const ROLL_STAGGER = 0.1; // title leads, summary follows
const ROLL_PARK = 105; // yPercent: fully below the slot

/** The project index: every project as a staggered, scroll-scaled card. */
export function Projects() {
  const sectionRef = useRef<HTMLElement>(null);

  useScrollReveal(sectionRef);

  // Scroll-driven scale + corner radius on each card's stage. Measured off the
  // <li> (its layout box, which the stage's transform never moves) and written
  // straight to style — nothing else touches the stage's transform, and four
  // rect reads a frame is nothing. Lenis scrolls the window natively, so plain
  // scroll events cover both smooth and native scrolling.
  useLayoutEffect(() => {
    const root = sectionRef.current;
    if (!root || prefersReducedMotion()) return;

    const stages = Array.from(root.querySelectorAll<HTMLElement>("[data-stage]"));
    if (!stages.length) return;

    const update = () => {
      const topLine = headerOffset();
      const finish = topLine + (window.innerHeight - topLine) * SCROLL_FINISH;
      const span = Math.max(1, window.innerHeight - finish);
      stages.forEach((stage) => {
        const box = (stage.parentElement ?? stage).getBoundingClientRect();
        const p = gsap.utils.clamp(0, 1, (box.top - finish) / span);
        stage.style.transform = `scale(${1 - SCROLL_SCALE_RANGE * p})`;
        stage.style.borderRadius = `${SCROLL_RADIUS_MAX * p}px`;
      });
    };

    update();
    // Once more after first paint: the header publishes its offset from a
    // post-paint effect, so the pass above measured against the bare viewport.
    const raf = requestAnimationFrame(update);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      stages.forEach((stage) => {
        stage.style.transform = "";
        stage.style.borderRadius = "";
      });
    };
  }, []);

  useLayoutEffect(() => {
    const root = sectionRef.current;
    if (!root || prefersReducedMotion()) return;

    const hoverCapable = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;

    const cleanups: Array<() => void> = [];
    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>("[data-card]").forEach((card) => {
        const img = card.querySelector<HTMLElement>("img");
        if (!img) return;

        const copy = card.querySelector<HTMLElement>("[data-copy]");
        const lines = card.querySelectorAll<HTMLElement>("[data-copy-line]");
        if (hoverCapable && copy) {
          gsap.set(copy, { autoAlpha: 0 });
          gsap.set(lines, { yPercent: ROLL_PARK });
        }

        const rollIn = () => {
          if (!hoverCapable || !copy) return;
          lines.forEach((line) => {
            if ((gsap.getProperty(line, "yPercent") as number) < 0) {
              gsap.set(line, { yPercent: ROLL_PARK });
            }
          });
          gsap.to(copy, { autoAlpha: 1, duration: ROLL, overwrite: true });
          gsap.to(lines, {
            yPercent: 0,
            duration: ROLL,
            ease: "back.out(1.3)",
            stagger: ROLL_STAGGER,
            overwrite: true,
          });
        };
        const rollOut = () => {
          if (!hoverCapable || !copy) return;
          gsap.to(lines, {
            yPercent: -ROLL_PARK,
            duration: ROLL,
            ease: "power2.in",
            stagger: ROLL_STAGGER,
            overwrite: true,
          });

          gsap.to(copy, {
            autoAlpha: 0,
            duration: ROLL,
            delay: ROLL_STAGGER,
            overwrite: true,
          });
        };

        const quick = { duration: 0.6, ease: "power3" } as const;
        const driftX = gsap.quickTo(img, "xPercent", quick);
        const driftY = gsap.quickTo(img, "yPercent", quick);

        const enter = () => {
          gsap.to(img, {
            scale: HOVER_SCALE,
            duration: 0.7,
            ease: "expo.out",
            overwrite: "auto",
          });
          rollIn();
        };
        const move = (e: globalThis.MouseEvent) => {
          const { left, top, width, height } = card.getBoundingClientRect();
          // -0.5 at the left/top edge, +0.5 at the right/bottom.
          const x = (e.clientX - left) / width - 0.5;
          const y = (e.clientY - top) / height - 0.5;
          driftX(-x * 2 * PARALLAX_MAX_PCT);
          driftY(-y * 2 * PARALLAX_MAX_PCT);
        };
        const leave = () => {
          gsap.to(img, {
            scale: 1,
            duration: 0.7,
            ease: "power4",
            overwrite: "auto",
          });
          driftX(0);
          driftY(0);
          rollOut();
        };

        card.addEventListener("mouseenter", enter);
        card.addEventListener("mousemove", move);
        card.addEventListener("mouseleave", leave);
        // Keyboard users on a hover-capable device have no hover: tabbing onto
        // a card rolls its copy in the same way.
        card.addEventListener("focusin", rollIn);
        card.addEventListener("focusout", rollOut);
        cleanups.push(() => {
          card.removeEventListener("mouseenter", enter);
          card.removeEventListener("mousemove", move);
          card.removeEventListener("mouseleave", leave);
          card.removeEventListener("focusin", rollIn);
          card.removeEventListener("focusout", rollOut);
        });
      });
    }, root);

    return () => {
      cleanups.forEach((fn) => fn());
      ctx.revert();
    };
  }, []);

  function onCardClick(e: MouseEvent<HTMLAnchorElement>, slug: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (prefersReducedMotion()) return;

    e.preventDefault();
    navigate(projectPath(slug));
  }

  return (
    <section
      ref={sectionRef}
      id="projects"
      className="relative gutter-x"
    >
      <div className="mx-auto mb-24 max-w-[1600px]">

      <ul className="[--bleed:calc(var(--gutter)_-_20px)] grid md:grid-cols-2 gap-[10px] pt-[10px] pb-[1px] -mx-[var(--bleed)] max-w-[calc(1600px_+_var(--gutter)*2_-_40px)]">
        {projects.map((p, i) => {
          // Projects without a dedicated thumbnail lead with their first
          // case-study image instead (projectImages puts the thumbnail first
          // when there is one, so this is the same lookup either way).
          const [thumbnail] = projectImages(p, 1);
          return (
          <li
            key={p.slug}
            data-reveal="fade"
            style={
              {
                "--row": i + 1,
                "--col": (i % 2) + 1,
                // Left column paints over the right where the two overlap.
                "--z": i % 2 ? 1 : 2,
              } as CSSProperties
            }
            className="relative md:row-(--row) md:col-(--col) md:aspect-[16/12.65] md:last:aspect-auto md:odd:left-[12.5%] md:even:right-[12.5%]"
          >
            <div
              data-stage
              className="relative overflow-hidden will-change-transform md:z-(--z) ring-0 ring-accent/0 transition-shadow duration-300 ease-[cubic-bezier(0.05,0,0,1)] hover:z-[101] hover:ring-[10px] hover:ring-accent hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.55),0_14px_32px_-12px_rgba(0,0,0,0.45)] md:mix-blend-luminosity hover:mix-blend-normal"
            >
            <a
              data-card
              href={projectPath(p.slug)}
              onClick={(e) => onCardClick(e, p.slug)}
              className="group relative block aspect-[16/11] bg-white/5"
            >
              {thumbnail && (
                <img
                  src={thumbnail}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}

              <div
                data-copy
                // Copy inset: a fixed 20px on mobile — the bleed there is
                // zero (gutter 20px − 20px inset), which would put the title
                // flush against the card's edge — and the bleed from md up.
                className="absolute inset-x-0 bottom-0 [--scrim-fade:5rem] pt-[var(--scrim-fade)] pb-4 md:pb-8 px-5 md:px-[var(--bleed)] flex flex-col gap-1 bg-[linear-gradient(to_top,#fff_0%,rgba(244,241,234,0.9)_calc(100%_-_var(--scrim-fade)),rgba(244,241,234,0)_100%)]"
              >
                <div className="overflow-hidden">
                  <div
                    data-copy-line
                    className="text-3xl font-semibold text-black leading-tight tracking-tighter"
                  >
                    {p.title}
                  </div>
                </div>
                <div className="overflow-hidden">
                  <div data-copy-line className="text-md text-black/80 leading-snug">
                    {p.summary}
                  </div>
                </div>
              </div>
            </a>
            </div>
          </li>
          );
        })}
      </ul>
      </div>
    </section>
  );
}
