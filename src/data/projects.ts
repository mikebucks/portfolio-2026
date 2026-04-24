export type Project = {
  slug: string;
  title: string;
  year: string;
  role: string;
  summary: string;
  tags: string[];
  body?: string[];
};

export const projects: Project[] = [
  {
    slug: "signal",
    title: "Signal",
    year: "2025",
    role: "Design & engineering",
    summary:
      "A design system and component library for a financial product, rebuilt from first principles.",
    tags: ["design-systems", "react", "tokens"],
    body: [
      "Rebuilt the component library from the ground up around a token pipeline, with reduced surface area and clearer primitives.",
      "Worked across engineering and design to ship a migration plan that didn't pause product work.",
    ],
  },
  {
    slug: "atlas",
    title: "Atlas",
    year: "2024",
    role: "Product design",
    summary:
      "Visual language and marketing site for an infrastructure platform.",
    tags: ["brand", "web", "motion"],
    body: [
      "Developed a visual system rooted in topography and signal — one that could flex from dense docs to a hero page.",
    ],
  },
  {
    slug: "harbor",
    title: "Harbor",
    year: "2024",
    role: "Creative technology",
    summary: "An interactive installation exploring crowd-driven audio.",
    tags: ["webgl", "audio", "installation"],
    body: [
      "A browser-based instrument projected onto a wall; audience members' phones became voices in a collective pad.",
    ],
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}
