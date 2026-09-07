import type { ProjectMedia } from "@/data/projects";
import { cn } from "@/lib/utils";

/** One media item (image / video / grid) as a <figure>. */
export function ProjectMediaFigure({
  media: m,
  className,
  captionClassName = "text-white/50",
}: {
  media: ProjectMedia;
  className?: string;
  captionClassName?: string;
}) {
  // m.className goes on the <figure>, last: a frame encloses the caption and the item wins.
  // Reach the media itself with child variants, e.g. [&_img]:rounded-none.

  return (
    <figure className={cn(className, m.className)}>
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
          // autoplay = GIF-style: muted, looping, no controls.
          {...(m.autoplay
            ? { autoPlay: true, muted: true, loop: m.loop ?? true }
            : { controls: true, loop: m.loop })}
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
              className={cn(
                "w-full h-auto rounded",
                m.aspect !== "natural" && "aspect-square object-cover",
              )}
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
  );
}
