import { ImageResponse } from "next/og";
import { OgCard } from "@/components/og/OgCard";
import { OG, SITE } from "@/lib/siteMeta";
import { getProject, projects } from "@/data/projects";
import { loadOgFonts } from "@/lib/ogFonts";

// Per-project override of the site-wide OG card.
export const alt = `${SITE.name} — project`;
export const size = OG.size;
export const contentType = OG.contentType;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function ProjectOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  const options = { ...size, fonts: await loadOgFonts() };

  if (!project) {
    return new ImageResponse(
      <OgCard title={SITE.title} description={SITE.description} />,
      options,
    );
  }

  return new ImageResponse(
    <OgCard
      kicker="Case study"
      title={project.title}
      description={project.summary}
    />,
    options,
  );
}
