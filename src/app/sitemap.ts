import type { MetadataRoute } from "next";
import { projects } from "@/data/projects";
import { SITE } from "@/lib/siteMeta";

// Driven off the project data rather than a hand-kept list, so adding a case
// study to src/data/projects.ts is enough.
export default function sitemap(): MetadataRoute.Sitemap {
  const sections = ["", "/projects", "/about", "/contact"].map((path) => ({
    url: `${SITE.url}${path}`,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  const caseStudies = projects.map((p) => ({
    url: `${SITE.url}/projects/${p.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...sections, ...caseStudies];
}
