import { ImageResponse } from "next/og";
import { OgCard } from "@/components/og/OgCard";
import { OG, SITE } from "@/lib/siteMeta";
import { getProject, projects } from "@/data/projects";
import { loadOgFonts } from "@/lib/ogFonts";

// Overrides the site-wide card for /projects/<slug>, so pasting a case-study
// link previews as that project rather than as the homepage. Project links are
// what actually gets shared, so this is the card most people will see.
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

  // Unknown slug: fall back to the site card rather than previewing a project
  // that can't be read.
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
