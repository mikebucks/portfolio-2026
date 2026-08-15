import type { ProjectStats } from "@/data/projects";
import { cn } from "@/lib/utils";

const COLUMNS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

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
        {stats.items.map((item, i) => (
          // Padding scales with the type: at the old p-4 the 44px figure sat
          // almost on the hairline.
          <div key={i} className="bg-white/60 p-5 md:p-6">
            <dt className="text-lg leading-snug text-black md:text-[21px]">
              {item.label}
            </dt>
            {/* The figure reuses the article title's step rather than inventing
                one — the grid never sits next to the title, so the two never
                compete, and the ramp stays four sizes wide instead of five. */}
            <dd className="mt-2 text-[32px] font-semibold leading-[1.3] text-black md:text-[44px]">
              {item.value}
              {item.note && (
                <span className="mt-2 block text-base font-display font-normal leading-snug tracking-normal text-black/65 md:text-lg">
                  {item.note}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
