import type { Metadata } from "next";
import { HomeClient } from "@/components/home/HomeClient";
import { getProject, projects } from "@/data/projects";
import { SITE } from "@/lib/siteMeta";

// The output is the same for every slug (the modal resolves it on the client),
// but listing them prerenders the shareable ones instead of server-rendering
// each on demand. Unknown slugs still render on request.
export async function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

// The page component ignores the slug, but the preview card must not: this is
// what makes a pasted case-study link read as that project instead of as the
// homepage. The matching image lives in ./opengraph-image.tsx. Returning {} for
// an unreadable project inherits the site-wide metadata from the root layout.
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

// A project case study is a modal over the homepage, not a page of its own —
// but it keeps a real, shareable URL. The homepage tree renders here and
// `ProjectModal` reads the slug off the path on mount, so a direct load lands
// with the case study already open.
//
// The slug isn't validated here: an unknown slug leaves the modal closed and
// the visitor on the homepage, same as before. Swap this for a
// `notFound()` if a real 404 is wanted (it'd need a not-found.tsx to match the
// site — the stock Next page doesn't).
export default function ProjectPage() {
  return <HomeClient />;
}
