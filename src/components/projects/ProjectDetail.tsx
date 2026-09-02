import type { Project, ProjectBlock, ProjectGraphic } from "@/data/projects";
import { cn } from "@/lib/utils";
import { ChiselProcess } from "./graphics/ChiselProcess";
import { ChiselStack } from "./graphics/ChiselStack";
import { ChiselWorkflow } from "./graphics/ChiselWorkflow";
import { ProjectMediaFigure } from "./ProjectMediaList";
import { ProjectStatGrid } from "./ProjectStatGrid";

/** Bespoke animated illustrations, keyed by a `graphic` block's `id`. */
const GRAPHICS: Record<
  ProjectGraphic["id"],
  (props: { className?: string }) => React.ReactNode
> = {
  "chisel-process": ChiselProcess,
  "chisel-stack": ChiselStack,
  "chisel-workflow": ChiselWorkflow,
};

/**
 * The reading column — narrower than the article itself, so copy holds a ~75
 * character measure while screenshots, video and stat grids run to the full
 * panel width. Everything that is words gets this; everything that is a picture
 * doesn't.
 */
const COLUMN = "max-w-[49.5rem]";

/**
 * Normalize a project into an ordered block list. Prefers the new `content`
 * field; otherwise falls back to the legacy `body` (rich-text paragraphs)
 * followed by the trailing `media` stack.
 */
function toBlocks(project: Project): ProjectBlock[] {
  if (project.content) return project.content;
  return [
    ...(project.body ?? []).map(
      (html): ProjectBlock => ({ type: "text", html }),
    ),
    ...(project.media ?? []),
  ];
}

/**
 * Vertical rhythm between blocks. Prose sits close to prose; anything touching
 * a full-width figure or stat grid gets the wide gap on both sides, so media
 * reads as a break in the column rather than another paragraph.
 */
function gapBefore(block: ProjectBlock, prev: ProjectBlock | undefined) {
  if (!prev) return "";
  return block.type === "text" && prev.type === "text" ? "mt-8" : "mt-14";
}

/**
 * Cream-themed (dark-text) project detail body, used inside the project modal.
 *
 * Pass `onBack` to put the wordmark at the top of the article as the way out of
 * the modal — it replaces a floating close affordance, so the exit lives in the
 * reading column where the eye already starts.
 */
export function ProjectDetail({
  project,
  onBack,
}: {
  project: Project;
  onBack?: () => void;
}) {
  const blocks = toBlocks(project);

  // `data-reveal` marks each element as one step of the modal's entrance
  // cascade (offset down + faded until ProjectModal reveals it — staggered on
  // open for what's in the viewport, on scroll for everything below).

  return (
    <article className="mx-auto max-w-6xl gutter-x pt-14 pb-24">
      <header>
        {onBack && (
          // A real href so middle-click and "copy link address" still work; the
          // click itself is intercepted so the modal plays its leave transition
          // instead of hard-navigating. -ml-2.5 cancels nav-link's own inline
          // padding, keeping the wordmark flush with the column like the header's.
          <a
            data-reveal
            href="/projects"
            onClick={(e) => {
              e.preventDefault();
              onBack();
            }}
            aria-label="Back to projects"
            className="nav-link -ml-2.5 mb-10 inline-block text-lg font-medium tracking-tight text-black md:mb-14 md:text-[21px]"
          >
            Mike<span className="font-bold">Bucks</span>
          </a>
        )}

        <h2
          data-reveal
          className={cn(
            COLUMN,
            "text-[32px] font-semibold leading-[1.3] text-black md:text-[44px]",
          )}
        >
          {project.title}
        </h2>
        <p
          data-reveal
          className={cn(
            COLUMN,
            "mt-2 text-2xl leading-[1.3] text-black/70 md:text-[28px]",
          )}
        >
          {project.summary}
        </p>
        {/* <p className="mt-10 text-lg font-medium text-black/70 md:mt-14 md:text-[21px]">
          {project.role}
        </p> */}
      </header>

      <section className="mt-10 border-t border-black/10 pt-10 md:mt-14 md:pt-14">
        {blocks.map((block, i) => {
          const gap = gapBefore(block, blocks[i - 1]);

          return block.type === "text" ? (
            // A <div> (not <p>) so block-level rich text like <ol>/<ul> is valid
            // markup — a <p> would be force-closed before a list.
            <div
              key={i}
              data-reveal
              className={cn(
                COLUMN,
                gap,
                "text-lg leading-[1.8] text-black/80 md:text-[21px]",
                "[&_a]:underline [&_strong]:font-semibold [&_strong]:text-black",
                "[&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-2 [&_li]:pl-1 [&_li]:marker:text-black/40",
                // Section headings hold one size across breakpoints — the title
                // shrinks on mobile and meets them, which is the whole ramp.
                "[&_h2]:mb-6 [&_h2]:mt-10 [&_h2]:text-[28px] [&_h2]:font-medium [&_h2]:leading-[1.3] [&_h2]:text-black md:[&_h2]:mb-8 md:[&_h2]:mt-14",
                "[&_h2:first-child]:mt-0",
              )}
              // Trusted, in-repo authored copy (see ProjectBlock) — not user input.
              dangerouslySetInnerHTML={{ __html: block.html }}
            />
          ) : block.type === "stats" ? (
            // Wrapped rather than tagged: these components own their root
            // classNames, and a wrapper keeps the reveal transform off any
            // layout they do internally. The gap margin collapses through it.
            <div key={i} data-reveal>
              <ProjectStatGrid stats={block} className={gap} />
            </div>
          ) : block.type === "graphic" ? (
            (() => {
              const Graphic = GRAPHICS[block.id];
              return (
                <figure key={i} data-reveal className={cn(gap, block.className)}>
                  <Graphic />
                  {block.caption && (
                    <figcaption className="mt-3 font-mono text-xs text-black/50">
                      {block.caption}
                    </figcaption>
                  )}
                </figure>
              );
            })()
          ) : (
            <div key={i} data-reveal>
              <ProjectMediaFigure
                media={block}
                className={gap}
                captionClassName="text-black/50"
              />
            </div>
          );
        })}
      </section>
    </article>
  );
}
