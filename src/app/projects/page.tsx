import type { Metadata } from "next";
import { HomeClient } from "@/components/home/HomeClient";
import { SITE } from "@/lib/siteMeta";

// Projects are a section of the homepage. See src/app/about/page.tsx.
export const metadata: Metadata = {
  title: "Projects",
  description:
    "Selected work — product design, interface systems, agentic tooling and the occasional audiovisual instrument.",
  alternates: { canonical: "/projects" },
  openGraph: {
    title: `Projects — ${SITE.name}`,
    url: `${SITE.url}/projects`,
  },
};

export default function ProjectsIndexPage() {
  return <HomeClient />;
}
