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
    slug: "chisel",
    title: "Chisel",
    year: "2026",
    role: "Design & Engineering",
    tags: ["design-systems", "react", "vercel", "continuous-integraion" ],
    summary:
      "Much more than a design system.",
    body: [
      "Chisel, a product design assistant combining Figment’s component library, design system, analytics, customer interviews, and issue tracking. Chisel moves design from a step in the process available to a select few, to a layer of infrastructure anyone in the org can use.",
      "At the heart of Chisel is a set of Claude Code skills that turn a prompt into a fully functioning feature inside Figment's frontend mono-repo.",
    ],
  },
  {
    slug: "beatvox",
    title: "BeatVox",
    year: "2026",
    role: "Solo Founder",
    tags: ["swiftui", "audio", "design"],
    summary: "TODO",
    body: [
      "TODO",
    ],
  },
  {
    slug: "figment-dApp",
    title: "Figment dApp",
    year: "2025",
    role: "Product Design & Growth",
    tags: ["react", "web3", "design"],
    summary:
      "TODO",
    body: [
      "TODO",
    ],
  },
  {
    slug: "figment-dashboard",
    title: "Figment Dashboard",
    year: "2024",
    role: "Product Design & Growth",
    tags: ["react", "web3", "design"],
    summary:
      "TODO",
    body: [
      "TODO",
    ],
  },
  {
    slug: "book-of-idra",
    title: "Book of Idra",
    year: "2022",
    role: "Design Engineering",
    tags: ["web3", "p5js", "design"],
    summary: "TODO",
    body: [
      "TODO",
    ],
  },
  {
    slug: "lyric-access",
    title: "Lyric Access",
    year: "2020",
    role: "Design Engineering",
    tags: ["obj-c", "rfid", "design"],
    summary: "TODO",
    body: [
      "TODO",
    ],
  },
  {
    slug: "lyric-app",
    title: "Lyric App",
    year: "2019",
    role: "Design Engineering",
    tags: ["react-native", "design"],
    summary: "TODO",
    body: [
      "TODO",
    ],
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}
