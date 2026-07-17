import type { ProjectMedia } from "@/data/projects";
import { cn } from "@/lib/utils";

/**
 * Renders a project's ordered media (image / video / grid). Shared by the
 * standalone detail route (dark page) and the cream modal, so the caption color
 * is passed in via `captionClassName`.
 */
export function ProjectMediaList({
  media,
  className,
  captionClassName = "text-white/50",
}: {
  media: ProjectMedia[];
  className?: string;
  captionClassName?: string;
}) {
  if (!media.length) return null;

  return (
    <div className={cn("space-y-12", className)}>
      {media.map((m, i) => (
        <figure key={i}>
          {m.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={m.src}
              alt={m.alt ?? ""}
              width={m.width}
              height={m.height}
              className="w-full h-auto rounded"
            />
          ) : m.type === "video" ? (
            <video
              src={m.src}
              poster={m.poster}
              width={m.width}
              height={m.height}
              controls
              playsInline
              className="w-full h-auto rounded"
            />
          ) : (
            <div
              className={cn(
                "grid gap-4",
                m.columns === 3 ? "grid-cols-3" : "grid-cols-2",
              )}
            >
              {m.items.map((item, j) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={j}
                  src={item.src}
                  alt={item.alt ?? ""}
                  width={item.width}
                  height={item.height}
                  className="aspect-square w-full h-auto object-cover rounded"
                />
              ))}
            </div>
          )}
          {m.caption && (
            <figcaption className={cn("mt-3 font-mono text-xs", captionClassName)}>
              {m.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
