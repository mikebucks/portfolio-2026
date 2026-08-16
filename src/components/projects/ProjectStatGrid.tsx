import { ArrowDown, ArrowUp } from "lucide-react";

import type { ProjectStats } from "@/data/projects";
import { cn } from "@/lib/utils";

const COLUMNS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * The two directions a stat can move. Each pairs a glyph with a color, and the
 * glyph is what actually carries the meaning — the color only reinforces it, so
 * the arrow still reads for a colorblind viewer or in forced-colors. The
 * screen-reader label does the same job for anyone who can't see either.
 *
 * These greens and reds are deeper than a UI "success"/"danger" would be: the
 * tile is a translucent white over cream, and the brighter steps only clear 3:1
 * against it. At these values both directions clear 4.5:1 and land within
 * 0.1 of each other, so neither arrow reads as the louder of the pair.
 */
const TRENDS = {
  up: { Glyph: ArrowUp, color: "text-[#00780f]", label: "Trending up" },
  down: { Glyph: ArrowDown, color: "text-[#c02d2d]", label: "Trending down" },
} as const;

/**
 * A project's headline numbers as a dashboard-style stat grid.
 *
 * The tiles are separated by the grid's own `gap-px` showing the container's
 * hairline through — one shared 1px rule between neighbours rather than a
 * border per tile, so nothing doubles up where two tiles meet or wraps to a
 * second row.
 *
 * Tiles are translucent white, not opaque: the modal's cream panel is itself
 * held short of opaque so the shader reads through it, and a solid tile would
 * punch three flat rectangles out of that.
 */
export function ProjectStatGrid({
  stats,
  className,
}: {
  stats: ProjectStats;
  className?: string;
}) {
  const columns = stats.columns ?? Math.min(stats.items.length, 3);

  return (
    <section className={className}>
      <dl
        className={cn(
          "grid gap-px overflow-hidden rounded bg-black/5",
          COLUMNS[columns] ?? COLUMNS[3],
        )}
      >
        {stats.items.map((item, i) => {
          const trend = item.trend && TRENDS[item.trend];

          return (
            // Padding scales with the type: at the old p-4 the 44px figure sat
            // almost on the hairline.
            <div key={i} className="bg-white/60 p-5 md:p-6">
              <dt className="text-lg leading-snug text-black md:text-[21px]">
                {item.label}
              </dt>
              {/* The figure reuses the article title's step rather than inventing
                one — the grid never sits next to the title, so the two never
                compete, and the ramp stays four sizes wide instead of five. */}
              <dd className="text-[32px] font-semibold leading-[1.3] text-black md:text-[44px]">
                {/* The arrow trails the figure rather than leading it: a leading
                  glyph would indent this tile's number and break the left edge
                  the figures share across the row. Sized in `em` so it tracks
                  the figure through the breakpoint, and heavier-stroked than
                  lucide's default, which goes wispy at this size. */}
                <span className="mt-1 inline-flex items-baseline gap-[0.15em]">
                  {trend && (
                    <>
                      <trend.Glyph
                        aria-hidden="true"
                        strokeWidth={3}
                        className={cn(
                          "size-[0.5em] shrink-0 -translate-y-[0.1em]",
                          trend.color,
                        )}
                      />
                      <span className="sr-only">{trend.label}</span>
                    </>
                  )}
                  {item.value}
                </span>
                {item.note && (
                  <span className="mt-2 block text-base font-display font-normal leading-snug tracking-normal text-black/60 md:text-lg">
                    {item.note}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
