import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { projects, getProject } from "@/data/projects";

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
    title: `${project.title} — Work`,
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
    <article className="mx-auto max-w-3xl px-6 pt-32 pb-24">
      <Link
        href="/work"
        className="font-mono text-xs text-white/60 hover:text-accent"
      >
        ← Work
      </Link>

      <header className="mt-8">
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
          {project.title}
        </h1>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-white/60">
          <span>{project.year}</span>
          <span>{project.role}</span>
          {project.tags.map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>
      </header>

      <section className="prose prose-invert mt-12 max-w-none">
        <p className="text-lg leading-relaxed">{project.summary}</p>
        {project.body?.map((para, i) => (
          <p key={i} className="mt-6 leading-relaxed text-white/90">
            {para}
          </p>
        ))}
      </section>
    </article>
  );
}
