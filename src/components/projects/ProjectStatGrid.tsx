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
          "mt-4 grid gap-px overflow-hidden rounded bg-black/5",
          COLUMNS[columns] ?? COLUMNS[3],
        )}
      >
        {stats.items.map((item, i) => (
          <div key={i} className="bg-white/60 p-4">
            <dt className="mb-1 text-sm leading-relaxed text-black">
              {item.label}
            </dt>
            <dd className="text-3xl leading-none font-semibold font-mono tracking-tight text-black">
              {item.value}
              {item.note && (
                <span className="mt-1 block text-sm font-display font-normal tracking-normal text-black/65">
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
