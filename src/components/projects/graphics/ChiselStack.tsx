"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { GRAPHIC_LABEL } from "./shared";

/**
 * Animated replacement for the static chisel-stack.png. The three layers —
 * CONTEXT, SKILLS, DELIVERY — run as columns (≥ md), and every card fans a
 * curved line into the next column, converging on its centre the way
 * openlogi.org's receiver diagram fans into the HID++ node. Grey dots travel
 * the curves left→right, departing in a top→bottom stagger.
 *
 * Below md the columns stack as single-column sections joined by one plain
 * vertical line each, dot flowing downward — a fan adds nothing when every
 * card shares the same centre line.
 *
 * The curves depend on where each card actually lands after text wrapping, so
 * this is a client component: card centres are measured on mount and on every
 * resize, and the SVG paths are drawn from the measurements. Dots animate via
 * SMIL (animateMotion), so once drawn no further JS runs.
 */

type Item = { title: string; sub: string };

const COLUMNS: { label: string; items: Item[] }[] = [
  {
    label: "Context",
    items: [
      { title: "Design principles", sub: "What does “good” design mean at Figment?" },
      { title: "Brand language", sub: "Type, color, voice, illustration, motion rules" },
      { title: "UX patterns", sub: "Navigation, forms, tables, empty/error/loading states" },
      { title: "Design tokens", sub: "Semantic variables, single source Figma ↔ code" },
      { title: "Component library", sub: "React components, variants, props, composition docs" },
      { title: "Usage analytics", sub: "How are customers using the products?" },
      { title: "Customer dossiers", sub: "Meeting transcripts, surveys, and support interactions" },
      { title: "Issue history", sub: "Linear issues. Past decisions and known problems" },
      { title: "Accessibility standards", sub: "WCAG targets, focus/contrast/ARIA rules" },
    ],
  },
  {
    label: "Skills",
    items: [
      { title: "Composition rules", sub: "Reuse before extend, extend before invent" },
      { title: "Component usage", sub: "How and when to use each component" },
      { title: "System-gap detection", sub: "Flags missing patterns, proposes system changes instead of one-offs" },
      { title: "Conventions", sub: "Naming, file structure, code style of the mono-repo" },
      { title: "Parse requirements", sub: "Understand and synthesize PRDs, tickets, or prompted instruction" },
      { title: "Accessibility enforcement", sub: "A11y checked at generation, not review" },
      { title: "Voice & tone", sub: "Brand guidelines for copywriting" },
      { title: "Scaffolding", sub: "Prompt → routed, stateful, working feature (not a static mock)" },
    ],
  },
  {
    label: "Delivery",
    items: [
      { title: "GitHub mono-repo", sub: "Branch + edit, same as any engineer" },
      { title: "Pull request", sub: "Human-legible diff, review surface" },
      { title: "CI checks", sub: "Build, lint, type-check, e2e, visual regression" },
      { title: "Vercel preview", sub: "Running build on every branch" },
      { title: "Report back", sub: "CI status + preview URL returned to the prompt author" },
    ],
  },
];

/** One measured fan: the svg's pixel size plus a path per source card. */
type Fan = { w: number; h: number; d: string[] };

const DOT_DUR = 2;
/** Seconds between neighbouring dots' departures — paths are built in card
 *  order, so the wave sweeps top → bottom through each fan. */
const DOT_STAGGER = 0.15;

export function ChiselStack({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fanRefs = useRef<(SVGSVGElement | null)[]>([]);
  const [fans, setFans] = useState<Fan[]>([]);

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    // The fans run horizontally between columns (≥ md) or vertically between
    // stacked sections; which one is live falls out of the svg's own shape.
    const next: Fan[] = [];
    for (let f = 0; f < COLUMNS.length - 1; f++) {
      const svg = fanRefs.current[f];
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      const horizontal = w < h;
      const d: string[] = [];
      if (horizontal) {
        const cards = root.querySelectorAll(
          `[data-fan-source="${f}"] [data-card]`,
        );
        for (const card of cards) {
          const c = card.getBoundingClientRect();
          const y = Math.round(c.top + c.height / 2 - rect.top);
          const end = Math.round(h / 2);
          d.push(`M 0 ${y} C ${w * 0.45} ${y}, ${w * 0.55} ${end}, ${w} ${end}`);
        }
      } else {
        // Stacked sections connect with one plain line — a fan reads wrong
        // when the single-column cards all share a centre.
        const x = Math.round(w / 2);
        d.push(`M ${x} 0 L ${x} ${h}`);
      }
      next.push({ w, h, d });
    }
    setFans((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
    );
  }, []);

  useEffect(() => {
    measure();
    const root = rootRef.current;
    if (!root) return;
    // Any reflow that moves a card (viewport resize, font swap, breakpoint
    // flip) changes the root's box, so observing it alone is enough.
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "flex flex-col items-stretch rounded-xl bg-ink p-4 md:flex-row md:p-6",
        className,
      )}
    >
      {COLUMNS.map((col, c) => (
        <Fragment key={col.label}>
          {c > 0 && (
            <svg
              ref={(el) => {
                fanRefs.current[c - 1] = el;
              }}
              aria-hidden
              className="h-14 w-full shrink-0 md:h-auto md:w-14 md:self-stretch"
              viewBox={
                fans[c - 1] ? `0 0 ${fans[c - 1].w} ${fans[c - 1].h}` : undefined
              }
            >
              {fans[c - 1]?.d.map((d, i) => (
                <Fragment key={i}>
                  <path
                    d={d}
                    fill="none"
                    stroke="rgba(255,255,255,0.16)"
                    strokeWidth="1"
                  />
                  <circle
                    r="3"
                    fill="rgba(255,255,255,0.6)"
                    opacity="0"
                    className="chisel-fan-dot"
                  >
                    <animateMotion
                      dur={`${DOT_DUR}s`}
                      begin={`${(i * DOT_STAGGER).toFixed(2)}s`}
                      repeatCount="indefinite"
                      path={d}
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      keyTimes="0;0.25;0.75;1"
                      dur={`${DOT_DUR}s`}
                      begin={`${(i * DOT_STAGGER).toFixed(2)}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                </Fragment>
              ))}
            </svg>
          )}

          <div
            data-fan-source={c}
            className="flex min-w-0 flex-1 flex-col md:basis-0"
          >
            <div className={cn(GRAPHIC_LABEL, "text-center text-white")}>
              {col.label}
            </div>
            {/* justify-center keeps a short column's cards vertically centred
                against its taller neighbours, so the fans converge on the
                middle of the pack rather than its top. */}
            <div className="mt-3 grid flex-1 content-center grid-cols-1 gap-2 md:gap-2.5">
              {col.items.map((item) => (
                <div
                  key={item.title}
                  data-card
                  className="rounded-lg bg-white px-3 py-2.5"
                >
                  <div className="text-[13px] font-semibold leading-tight text-black">
                    {item.title}
                  </div>
                  <div className="mt-1 text-[11px] leading-snug text-black/50">
                    {item.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
