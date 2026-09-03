"use client";

import { useLayoutEffect, useRef, type MouseEvent } from "react";
import gsap from "gsap";
import { featuredProjects } from "@/data/projects";
import { prefersReducedMotion } from "@/lib/device";
import { navigate, projectPath } from "@/lib/appRoute";
import { useScrollReveal } from "@/components/animation/useScrollReveal";
import { AllProjects } from "./AllProjects";

// Hover zoom on the thumbnail. Everything above 1 is the room the parallax
// below has to move in: the image overflows the card by (SCALE - 1) / 2 on
// each edge — 2.5% at 1.05.
const HOVER_SCALE = 1.05;
// How far the pointer can slide the image, as a percentage of its own size
// on each axis, at the card's edge. Deliberately well inside the overflow:
// the drift should register as depth, not as the picture moving. Must stay
// at or below (HOVER_SCALE - 1) / 2 * 100 or an edge shows.
const PARALLAX_MAX_PCT = 1.5;

// Card copy roll — the cycling word's departure-board move (see CyclingWord):
// each line sits in a clipped slot, rolls up into it from below with a little
// overshoot on hover, and leaves up through the top. Same figures as the word
// so the two read as one gesture.
const ROLL = 0.35; // one line's travel through its slot
const ROLL_STAGGER = 0.1; // title leads, summary follows
const ROLL_PARK = 105; // yPercent: fully below the slot

export function FeaturedProjects() {
  const featured = featuredProjects;
  const sectionRef = useRef<HTMLElement>(null);

  // Scroll-in transition on the case-study blocks' timing (0.9s expo.out,
  // 0.18s stagger), so the section reads as a page transition of its own:
  // the featured cards grow into place, the index rows rise. Targets are the
  // `[data-reveal]` items here AND inside AllProjects (it renders in this
  // section's column), so one observer covers both.
  useScrollReveal(sectionRef);

  // Thumbnail zoom + parallax. GSAP owns the image transform for motion users
  // so the zoom and the pointer-driven drift can share it — a CSS hover scale
  // and an inline GSAP translate would each clobber the other. The image
  // slides AGAINST the pointer on both axes (pointer toward a corner → image
  // away from it), which is the whole trick: the image is already zoomed, so
  // it has that overflow to move through without ever exposing an edge.
  useLayoutEffect(() => {
    const root = sectionRef.current;
    if (!root || prefersReducedMotion()) return;

    // The copy roll is hover-only, so it's gated on a pointer that can hover.
    // Touch users can't hover, so their copy stays where the markup ships it:
    // visible. The rest state is only ever committed from inside this branch,
    // so no device can lose the copy without the roll that brings it back.
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
          // Re-park below the slot unless a line is still mid-roll — a quick
          // out-and-back then reverses the exit rather than restarting it,
          // which is what the gesture should look like.
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
          // The scrim holds until the last line has cleared the slot.
          gsap.to(copy, {
            autoAlpha: 0,
            duration: ROLL,
            delay: ROLL_STAGGER,
            overwrite: true,
          });
        };

        // The drift is a pair of quickTos, and xPercent/yPercent belong to
        // them ALONE. No other tween on the image may name either: the
        // enter/leave tweens below run with `overwrite: "auto"`, which kills
        // any competing tween of the same property — and a quickTo whose
        // tween has been killed is dead for good. So leave resets the drift
        // through the drift itself.
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

  // Client-side navigation so the modal plays its rise-from-the-bottom
  // entrance instead of a hard load. See ProjectModal.
  function onCardClick(e: MouseEvent<HTMLAnchorElement>, slug: string) {
    // Modified clicks (new tab, etc.) and reduced-motion users keep the plain
    // anchor — /projects/<slug> serves the same page with the modal open, just
    // without the entrance.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (prefersReducedMotion()) return;

    e.preventDefault();
    navigate(projectPath(slug));
  }

  return (
    <section
      ref={sectionRef}
      id="projects"
      // `relative` WITHOUT a z-index, deliberately. A z-index here would open a
      // stacking context and scope every descendant's z-index inside it — a card
      // at z-101 would still be worth only "10" to the page, which is what put
      // its hover ring under the fixed cream frame bars (z-100 in layout.tsx).
      // A descendant can't escape its ancestor's context, so the choice is
      // between lifting this whole section (which drags the All-projects panel
      // over the frame with it) and not being a context at all. Not being one is
      // right: the cards then carry their own z at page level and nothing else
      // in here moves.
      //
      // `relative` still earns its place — it keeps the section painting as a
      // positioned box, above the fixed shader layer behind it. Nothing in the
      // page needs this section ordered against its sibling sections; they're
      // stacked vertically and never overlap.
      className="relative gutter-x"
    >
      {/* The centering column. Past 1600px the gutters stop growing and this
          takes over, so the heading, the card row and the all-projects list all
          center as one block instead of hugging the left rail. The card row
          below bleeds out of this box, not out of the section, which is what
          keeps its overhang symmetric on a widescreen. */}
      <div className="mx-auto max-w-[1600px]">

      {/* Full bleed: the row escapes the section's gutters with a negative
          margin, so the thumbnails run edge to edge. Negative margins rather
          than 100vw — the page reserves a scrollbar gutter (`scrollbar-gutter:
          stable` on html), which 100vw includes and would push out as
          horizontal overflow.

          The max-width carries the same two bleeds: it caps the element's own
          box, which starts a bleed further left than the 1600px column above
          it, so a bare 1600px would measure the wrong column — the row would
          sit that much to the left of the heading and stop that much short of
          it on the right. Adding both back makes the cap the 1600px column plus
          its bleed on each side, so the row grows out of that column
          symmetrically instead of being offset by it.

          Two bleeds, split at 1684px, because a hovered card's ring is drawn
          10px OUTSIDE the card and has to land somewhere visible.

          Below the split the max-width isn't binding: the row runs to the
          viewport edge, and bled a full gutter the outer cards' outer rings
          landed at x=-10..0 — off the viewport entirely, not merely under the
          cream frame, and no z-index could recover them. So the bleed there is
          a gutter MINUS the frame's 10px, stopping the row against the rails'
          inner edge instead of under them. At rest that's invisible (the rail
          was painting over that 10px of thumbnail anyway); on hover the ring
          lands exactly on the rail it used to hide beneath, and with the
          section's z-lift above, the page frame reads as turning accent
          alongside the card.

          At and above the split the cap has taken over, the row is centered,
          and its own margin already clears the rails — so it takes the full
          gutter back and overhangs the column by exactly one, as it always did.
          1684px is where the two agree (1600 + 2*gutter + 20): the centered
          row's edge is at x=10 there too, so the swap is seamless rather than a
          10px jump at the breakpoint.

          Both bleeds are published as --bleed so the cards' own padding can
          read it back — that's what keeps their copy on the column. See the
          card content div below. */}
      <ul className="[--bleed:calc(var(--gutter)_-_10px)] min-[1684px]:[--bleed:var(--gutter)] grid md:grid-cols-2 gap-[1px] pt-[10px] pb-[1px] -mx-[var(--bleed)] max-w-[calc(1600px_+_var(--gutter)*2_-_20px)] min-[1684px]:max-w-[calc(1600px_+_var(--gutter)*2)]">
        {featured.map((p) => (
          <li
            key={p.slug}
            // Scroll-in: the card grows into place (see useScrollReveal); the
            // index rows below rise instead.
            data-reveal="scale"
            // The hovered card lifts above its neighbours so its cream ring —
            // drawn 10px outside its own box, over whatever is next to it —
            // isn't painted over by the card that follows it in the DOM. The
            // lift is instant either way: z-index is out of the transition
            // list, so only the ring and the shadow animate.
            //
            // 101 is an exact figure, not a "big number": the section above
            // isn't a stacking context, so this competes at page level, where
            // every layer is already spoken for. It has to clear the cream frame
            // bars (100) for the ring to be seen at all, and stay under the
            // scrolled header (110) and the project modal (120) — a card
            // scrolled up behind the nav must not paint over it. The old z-10000
            // was safe only because the section was capping it at 10.
            //
            // Ring and shadow are one property: Tailwind composes both into
            // box-shadow, so the drop shadow rides the transition already
            // named there. It's deep and far-thrown on purpose — the row is
            // edge to edge now, and the shadow is the only thing separating a
            // raised card from the two still lying flat beside it.
            className="relative z-0 overflow-hidden ring-0 ring-accent/0 transition-[border-radius,box-shadow] duration-300 ease-[cubic-bezier(0.05,0,0,1)] hover:z-[101] hover:ring-[10px] hover:ring-accent hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.55),0_14px_32px_-12px_rgba(0,0,0,0.45)] md:mix-blend-luminosity hover:mix-blend-normal"
          >
            <a
              data-card
              href={projectPath(p.slug)}
              onClick={(e) => onCardClick(e, p.slug)}
              className="group relative block aspect-[16/11] bg-white/5"
            >
              {p.thumbnail && (
                // Zoom and parallax are GSAP-driven (see the effect above);
                // no CSS hover transform here or the two would fight. And no
                // will-change: it pinned four ~5MB textures as permanent
                // compositor layers for a gain GSAP already provides by
                // promoting the image for the duration of its tweens.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.thumbnail}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}

              {/* Scrim + content in one box, deliberately. The scrim used to be
                  a separate full-card layer fading out at a fixed 30% of the
                  card's height, which only ever held on a wide card: the card
                  is a fixed 16/11 ratio, so a narrow one is short, while the
                  copy inside it gets TALLER as the title and summary wrap to
                  more lines. On a phone that crossed over — the title was
                  sitting above the 30% mark, on bare photo, and stopped being
                  readable. Any fixed fraction has the same failure, just at a
                  different width.

                  So the gradient is painted on the text block itself. That box
                  is bottom-anchored and only as tall as its own copy plus
                  --scrim-fade of headroom, so it grows line for line with the
                  text and the scrim can't be outrun. The stops are lengths, not
                  percentages, for the same reason: solid up to
                  `100% - --scrim-fade`, i.e. right up to the first line of
                  copy, then fading over exactly that headroom. The soft edge is
                  a constant 5rem at every width instead of a slice of the
                  card, and the art above it stays untouched.

                  Absolute rather than `h-full` + `justify-end`: the height has
                  to come from the content, not the card. It's the only thing in
                  the anchor's flow, so nothing else moves.

                  Colors are --color-cream at 90% and at 0 — written out because
                  a stop needs the alpha baked in, and landing on cream (not
                  `transparent`) keeps the fade from drifting through grey.

                  The horizontal padding is the row's own bleed, not a design
                  value — that's the whole distance between the card's left edge
                  and the 1600px column the rest of the page measures from, so
                  paying exactly it back lands this copy on the same line as the
                  "All projects" titles below, at every width. Any fixed padding
                  can only be right at one breakpoint: the bleed is a gutter
                  minus 10px under 1684px and a full gutter over it, and the
                  gutter itself steps 20px → 32px at 40rem — so the target is
                  10px, then 22px, then 32px. Vertical padding is free to be a
                  design value, so it stays one.

                  On hover-capable devices the whole block is hidden at rest and
                  rolls in on hover (data-copy / data-copy-line, driven by the
                  effect above). Each line's outer div is the clipping slot,
                  the inner one is what moves — so a line mid-roll shears off
                  at the slot edge like the cycling word's letters. The markup
                  ships everything visible and unmoved; only the effect parks
                  it, so touch and reduced-motion users never lose the copy. */}
              <div
                data-copy
                className="absolute inset-x-0 bottom-0 [--scrim-fade:5rem] pt-[var(--scrim-fade)] pb-4 md:pb-8 px-[var(--bleed)] flex flex-col gap-2 bg-[linear-gradient(to_top,#fff_0%,rgba(244,241,234,0.9)_calc(100%_-_var(--scrim-fade)),rgba(244,241,234,0)_100%)]"
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
          </li>
        ))}
      </ul>

        <AllProjects />
      </div>
    </section>
  );
}
