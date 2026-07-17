import type { Project } from "@/data/projects";
import { ProjectMediaList } from "./ProjectMediaList";

/**
 * Cream-themed (dark-text) project detail body, used inside the project modal.
 * The standalone /projects/[slug] route keeps its own dark-page treatment and
 * shares only the media renderer.
 */
export function ProjectDetail({ project }: { project: Project }) {
  return (
    <article className="mx-auto max-w-5xl px-6 pt-14 pb-24 md:px-10">
      <header>
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-black">
          {project.title}
        </h2>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-black/60">
          <span>{project.role}</span>
          {project.tags.filter(Boolean).map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>
      </header>

      <section className="mt-10">
        <p className="text-lg leading-relaxed text-black">{project.summary}</p>
        {project.body?.map((para, i) => (
          <p key={i} className="mt-6 leading-relaxed text-black/80">
            {para}
          </p>
        ))}
      </section>

      {project.media && project.media.length > 0 && (
        <ProjectMediaList
          media={project.media}
          className="mt-14"
          captionClassName="text-black/50"
        />
      )}
    </article>
  );
}
