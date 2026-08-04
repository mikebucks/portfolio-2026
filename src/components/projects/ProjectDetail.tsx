import type { Project, ProjectBlock } from "@/data/projects";
import { ProjectMediaFigure } from "./ProjectMediaList";

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
 * Cream-themed (dark-text) project detail body, used inside the project modal.
 * The standalone /projects/[slug] route keeps its own dark-page treatment and
 * shares only the media renderer.
 */
export function ProjectDetail({ project }: { project: Project }) {
  const blocks = toBlocks(project);

  return (
    <article className="mx-auto max-w-5xl gutter-x pt-14 pb-24 md:px-10">
      <header>
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-black">
          {project.title}
        </h2>
        <p className="max-w-3xl text-xl md:text-2xl font-light leading-snug text-black/75">
          {project.summary}
        </p>
        <div className="mt-4 font-mono text-xs text-black/60">
          {project.role}
        </div>
      </header>

      <section className="mt-4">
        {blocks.map((block, i) =>
          block.type === "text" ? (
            // A <div> (not <p>) so block-level rich text like <ol>/<ul> is valid
            // markup — a <p> would be force-closed before a list.
            <div
              key={i}
              className="mt-4 leading-relaxed text-black/80 [&_a]:underline [&_strong]:font-semibold [&_strong]:text-black  [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1 [&_li]:pl-1 [&_li]:marker:text-black/40"
              // Trusted, in-repo authored copy (see ProjectBlock) — not user input.
              dangerouslySetInnerHTML={{ __html: block.html }}
            />
          ) : (
            <ProjectMediaFigure
              key={i}
              media={block}
              className="mt-4"
              captionClassName="text-black/50"
            />
          ),
        )}
      </section>
    </article>
  );
}
