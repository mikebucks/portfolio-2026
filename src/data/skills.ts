export type Skill = {
  name: string;
  score: number;
  readonly group: "Design" | "Code" | "Product" | "AI" | "Leadership";
};

export type ProjectSkill = Pick<Skill, "name" | "score">;

// specifics.design assessment inspired
export const SKILLS: Skill[] = [
  { name: "Product UI, Web",   score: 10, group: "Design" },
  { name: "Product UI, Mobile",score: 9,  group: "Design" },
  { name: "Systems Design",    score: 10, group: "Design" },
  { name: "Growth",            score: 7,  group: "Design" },
  { name: "UX Research",       score: 7,  group: "Design" },
  { name: "UX Wires",          score: 9,  group: "Design" },
  { name: "Fun Marketing",     score: 9,  group: "Design" },
  { name: "Branding",          score: 3,  group: "Design" },
  { name: "Illustration",      score: 1, group: "Design" },
  { name: "Motion",            score: 6, group: "Design" },
  
  { name: "React/Next.js",     score: 8, group: "Code" },
  { name: "JavaScript/TypeScript", score: 7, group: "Code" },
  { name: "HTML/CSS",          score: 10, group: "Code" },
  { name: "Tailwind",          score: 10, group: "Code" },
  { name: "Rapid Prototyping", score: 10, group: "Code" },
  { name: "Design Systems",    score: 9, group: "Code" },
  { name: "Git",               score: 10, group: "Code" },
  { name: "Data Viz",          score: 8, group: "Code" },
  { name: "Storybook/Chromatic", score: 6, group: "Code" },
  
  { name: "Product Strategy",  score: 8, group: "Product" },
  { name: "0→1 Products",      score: 8, group: "Product" },
  { name: "Metrics & KPIs",    score: 10, group: "Product" },
  { name: "Experimentation",   score: 9, group: "Product" },
  { name: "Discovery",         score: 6, group: "Product" },  
  { name: "Roadmapping",       score: 7, group: "Product" },
  { name: "Stakeholder Mgmt",  score: 5, group: "Product" },
  
  { name: "Manager",           score: 8, group: "Leadership" },
  { name: "Hands-on IC",       score: 10, group: "Leadership" },
  { name: "E-commerce",        score: 5, group: "Leadership" },

  { name: "Design for AI",     score: 10, group: "AI" },
  { name: "AI – Vibe Code",    score: 10, group: "AI" },
  { name: "AI – Img/Vid Gen",  score: 3, group: "AI" },
  { name: "AI – Agent Building",score: 10, group: "AI" },
];

export const GROUPS: { key: Skill["group"]; label: string }[] = [
  { key: "Design",     label: "Design" },
  { key: "Code",       label: "Code" },
  { key: "Product",    label: "Product" },
  { key: "AI",         label: "AI" },
  { key: "Leadership", label: "Leadership" },
];

