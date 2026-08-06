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
              href={projectPath(p.slug)}
              onClick={(e) => onCardClick(e, p.slug)}
              className="group relative block aspect-[16/11] bg-white/5"
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
              <div className="absolute inset-0 bg-gradient-to-t from-white from-0% via-cream/90 via-20% to-transparent to-30% "  />

              {/* Content. The horizontal padding is the row's own bleed, not a
                  design value — that's the whole distance between the card's
                  left edge and the 1600px column the rest of the page measures
                  from, so paying exactly it back lands this copy on the same
                  line as the "All projects" titles below, at every width. Any
                  fixed padding can only be right at one breakpoint: the bleed is
                  a gutter minus 10px under 1684px and a full gutter over it, and
                  the gutter itself steps 20px → 32px at 40rem — so the target is
                  10px, then 22px, then 32px. Vertical padding is free to
                  be a design value, so it stays one. */}
              <div className="relative h-full py-4 md:py-8 px-[var(--bleed)] flex flex-col gap-2 justify-end">
                <div className="text-2xl font-semibold text-black leading-tight tracking-tight">
                  {p.title}
                </div>
                <div className="text-sm text-black/80 leading-snug">
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
