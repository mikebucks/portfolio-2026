export type Skill = {
  name: string;
  score: number;
  readonly group: "Design" | "Code" | "Product" | "AI" | "Leadership";
};

export type ProjectSkill = Pick<Skill, "name" | "score">;

// Equal counts per group keep the viz columns level.
export const SKILLS: Skill[] = [
  { name: "Product UI",    score: 10, group: "Design" },
  { name: "Design Systems",     score: 10, group: "Design" },
  { name: "Design Strategy", score: 9,  group: "Design" },
  { name: "UX Wires",           score: 9,  group: "Design" },
  { name: "Research",        score: 7,  group: "Design" },
  { name: "Fun Marketing",      score: 9,  group: "Design" },
  { name: "Motion",             score: 6,  group: "Design" },
  // { name: "Growth",             score: 7,  group: "Design" },
  // { name: "Accessibility",      score: 7,  group: "Design" },
  // { name: "Branding",           score: 3,  group: "Design" },
  // { name: "Illustration",       score: 1,  group: "Design" },

  { name: "HTML/CSS",           score: 10, group: "Code" },
  { name: "JavaScript/TypeScript", score: 7, group: "Code" },
  { name: "Rapid Prototyping",  score: 10, group: "Code" },
  { name: "Git",                score: 10, group: "Code" },
  { name: "Design Systems",     score: 9,  group: "Code" },
  { name: "Data Viz",           score: 8,  group: "Code" },
  { name: "React/Next.js",      score: 8,  group: "Code" },
  // { name: "Tailwind",           score: 10, group: "Code" },
  // { name: "WebGL/Shaders",      score: 7,  group: "Code" },
  // { name: "Perf & Web Vitals",  score: 7,  group: "Code" },
  // { name: "CI/CD & Deploys",    score: 7,  group: "Code" },
  // { name: "Storybook/Chromatic", score: 6, group: "Code" },

  { name: "Metrics & KPIs",     score: 10, group: "Product" },
  { name: "Experimentation",    score: 9,  group: "Product" },
  { name: "Product Strategy",   score: 8,  group: "Product" },
  { name: "0→1 Products",       score: 8,  group: "Product" },
  { name: "Customer Interviews", score: 8, group: "Product" },
  { name: "Growth",        score: 7,  group: "Product" },
  { name: "Discovery",          score: 6,  group: "Product" },
  // { name: "Roadmapping",        score: 7,  group: "Product" },
  // { name: "PRDs & Specs",       score: 8,  group: "Product" },
  // { name: "Go-to-Market",       score: 7,  group: "Product" },
  // { name: "SQL & Analytics",    score: 7,  group: "Product" },
  // { name: "Stakeholder Mgmt",   score: 5,  group: "Product" },
  // { name: "Pricing & Packaging", score: 4, group: "Product" },

  { name: "AI-Native UX",       score: 10, group: "AI" },
  { name: "Agentic Coding",     score: 10, group: "AI" },
  { name: "Agent Orchestration", score: 10, group: "AI" },
  { name: "MCP & Tool Use",     score: 9,  group: "AI" },
  { name: "Evals & Quality",    score: 8,  group: "AI" },
  { name: "LLM APIs & SDKs",    score: 8,  group: "AI" },
  { name: "Img/Video Gen",      score: 5,  group: "AI" },
  // { name: "Prompt Engineering", score: 9,  group: "AI" },
  // { name: "Context Engineering", score: 8, group: "AI" },
  // { name: "Model Behavior",     score: 8,  group: "AI" },
  // { name: "Human-in-the-Loop",  score: 8,  group: "AI" },
  // { name: "RAG & Retrieval",    score: 6,  group: "AI" },
  

  { name: "Player-Coach",       score: 10, group: "Leadership" },
  { name: "Craft Standards",    score: 10, group: "Leadership" },
  { name: "Mentorship",         score: 9,  group: "Leadership" },
  { name: "Critique & Feedback", score: 9, group: "Leadership" },
  { name: "Exec Communication", score: 8,  group: "Leadership" },
  { name: "Design Ops",         score: 7,  group: "Leadership" },
  { name: "Career Development", score: 6,  group: "Leadership" },
  // { name: "Cross-Functional",   score: 9,  group: "Leadership" },
  // { name: "Storytelling",       score: 9,  group: "Leadership" },
  // { name: "People Management",  score: 8,  group: "Leadership" },
  // { name: "Influence & Buy-in", score: 8,  group: "Leadership" },
  // { name: "Hiring & Onboarding", score: 7, group: "Leadership" },
];

export const GROUPS: { key: Skill["group"]; label: string }[] = [
  { key: "Design",     label: "Design" },
  { key: "Code",       label: "Code" },
  { key: "Product",    label: "Product" },
  { key: "AI",         label: "AI" },
  { key: "Leadership", label: "Leadership" },
];

