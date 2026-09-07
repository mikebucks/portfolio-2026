import type { Project, ProjectBlock, ProjectGraphic } from "@/data/projects";
import { cn } from "@/lib/utils";
import { ChiselProcess } from "./graphics/ChiselProcess";
import { ChiselStack } from "./graphics/ChiselStack";
import { ChiselWorkflow } from "./graphics/ChiselWorkflow";
import { ProjectMediaFigure } from "./ProjectMediaList";
import { ProjectStatGrid } from "./ProjectStatGrid";

const GRAPHICS: Record<
  ProjectGraphic["id"],
  (props: { className?: string }) => React.ReactNode
> = {
  "chisel-process": ChiselProcess,
  "chisel-stack": ChiselStack,
  "chisel-workflow": ChiselWorkflow,
};

/** Reading column (~75ch) for text; media runs full width. */
const COLUMN = "max-w-[49.5rem]";

function gapBefore(prev: ProjectBlock | undefined) {
  return prev ? "mt-14" : "";
}

/** Cream-themed detail body for the modal. `onBack` makes the top wordmark the exit. */
export function ProjectDetail({
  project,
  onBack,
}: {
  project: Project;
  onBack?: () => void;
}) {
  const blocks = project.content;

  // data-reveal: one step of ProjectModal's entrance cascade.

  return (
    <article className="mx-auto max-w-6xl gutter-x pt-14 pb-24">
      <header>
        {onBack && (
          // Real href keeps middle-click working; click is intercepted for the leave transition.
          // -ml-2.5 cancels nav-link's inline padding.
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
          const gap = gapBefore(blocks[i - 1]);

          return block.type === "text" ? (
            // <div> not <p>: a <p> is force-closed before block html like <ol>.
            <div
              key={i}
              data-reveal
              className={cn(
                COLUMN,
                gap,
                "text-lg leading-[1.8] text-black/80 md:text-[21px]",
                "[&_a]:underline [&_strong]:font-semibold [&_strong]:text-black",
                "[&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-2 [&_li]:pl-1 [&_li]:marker:text-black/40",
                // h2 holds one size across breakpoints; the title shrinks to meet it.
                "[&_h2]:mb-6 [&_h2]:mt-10 [&_h2]:text-[28px] [&_h2]:font-medium [&_h2]:leading-[1.3] [&_h2]:text-black md:[&_h2]:mb-8 md:[&_h2]:mt-14",
                "[&_h2:first-child]:mt-0",
              )}
              // Trusted in-repo copy, not user input.
              dangerouslySetInnerHTML={{ __html: block.html }}
            />
          ) : block.type === "stats" ? (
            // Wrapper keeps the reveal transform off the component's own layout.
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
