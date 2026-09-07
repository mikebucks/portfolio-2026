import type { Metadata } from "next";
import { HomeClient } from "@/components/home/HomeClient";
import { getProject, projects } from "@/data/projects";
import { SITE } from "@/lib/siteMeta";

export async function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

// Per-project link preview; {} falls back to the root metadata.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};

  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: `/projects/${slug}` },
    openGraph: {
      type: "article",
      title: `${project.title} — ${SITE.name}`,
      description: project.summary,
      url: `${SITE.url}/projects/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.title} — ${SITE.name}`,
      description: project.summary,
    },
  };
}

// Case studies are a modal over the homepage; ProjectModal reads the slug on mount.
// Unknown slugs just leave the modal closed.
export default function ProjectPage() {
  return <HomeClient />;
}
