import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { projects, getProject } from "@/data/projects";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectMediaList } from "@/components/projects/ProjectMediaList";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  props: { params: Promise<Params> },
): Promise<Metadata> {
  const { slug } = await props.params;
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: `${project.title} — Projects`,
    description: project.summary,
  };
}

export default async function ProjectPage(
  props: { params: Promise<Params> },
) {
  const { slug } = await props.params;
  const project = getProject(slug);
  if (!project) notFound();

  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href="/#projects"
            className="font-mono text-xs text-white hover:text-accent"
          >
            ← Projects
          </Link>
        }
        title={project.title}
      >
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-white/80">
          <span>{project.role}</span>
          {project.tags.map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>
      </PageHeader>

      <article className="max-w-[1600px] px-8 pt-16 pb-24">
      <section className="prose prose-invert max-w-5xl">
        <p className="text-lg leading-relaxed">{project.summary}</p>
        {project.body?.map((para, i) => (
          <p key={i} className="mt-6 leading-relaxed text-white/90">
            {para}
          </p>
        ))}
      </section>

      {project.media && project.media.length > 0 && (
        <ProjectMediaList media={project.media} className="mt-16 max-w-5xl" />
      )}
      </article>
    </>
  );
}
