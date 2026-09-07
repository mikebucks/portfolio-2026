import { ArrowDown, ArrowUp } from "lucide-react";

import type { ProjectStats } from "@/data/projects";
import { cn } from "@/lib/utils";

const COLUMNS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

// Glyph carries the meaning; colour only reinforces it. These deep green/red
// clear 4.5:1 on the translucent tile and match each other's contrast.
const TRENDS = {
  up: { Glyph: ArrowUp, color: "text-[#00780f]", label: "Trending up" },
  down: { Glyph: ArrowDown, color: "text-[#c02d2d]", label: "Trending down" },
} as const;

/**
 * Headline numbers as a stat grid. gap-px shows the container hairline between
 * tiles (no doubled borders); tiles stay translucent so the shader reads through.
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
            // p-5: at p-4 the 44px figure sat on the hairline.
            <div key={i} className="bg-white/60 p-5 md:p-6">
              <dt className="text-lg leading-snug text-black md:text-[21px]">
                {item.label}
              </dt>
              {/* Reuses the title's type step; keeps the ramp at four sizes. */}
              <dd className="text-[32px] font-semibold leading-[1.3] text-black md:text-[44px]">
                {/* Arrow trails the figure to keep the row's shared left edge.
                  em-sized to track the breakpoint; stroke 3 as the default goes wispy. */}
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
                  <span className="mt-3 block text-base font-display font-normal italic leading-snug tracking-normal text-black/60 md:text-lg">
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
