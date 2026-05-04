export type Skill = {
  name: string;
  score: number;
  readonly group: "Design" | "Code" | "AI" | "Leadership";
};

export type ProjectSkill = Pick<Skill, "name" | "score">;

// Master list — specifics.design assessment order
export const SKILLS: Skill[] = [
  { name: "Branding",          score: 3,  group: "Design" },
  { name: "Fun Marketing",     score: 9,  group: "Design" },
  { name: "Product UI, Web",   score: 10, group: "Design" },
  { name: "Product UI, Mobile",score: 9,  group: "Design" },
  { name: "Systems Design",    score: 10, group: "Design" },
  { name: "Growth",            score: 7,  group: "Design" },
  { name: "UX Research",       score: 9,  group: "Design" },
  { name: "UX Wires",          score: 8,  group: "Design" },
  { name: "Frontend Code",     score: 10, group: "Code" },
  { name: "No/Low Code",       score: 10, group: "Code" },
  { name: "Motion",            score: 6, group: "Design" },
  { name: "Design for AI",     score: 10, group: "AI" },
  { name: "Illustration",      score: 0, group: "Design" },
  { name: "Manager",           score: 8, group: "Leadership" },
  { name: "Hands-on IC",       score: 10, group: "Leadership" },
  { name: "E-commerce",        score: 5, group: "Leadership" },
  { name: "AI – Vibe Code",    score: 10, group: "AI" },
  { name: "AI – Img/Vid Gen",  score: 3, group: "AI" },
  { name: "AI – Agent Building",score: 10, group: "AI" },
];

export const GROUPS: { key: Skill["group"]; label: string }[] = [
  { key: "Design",     label: "Design" },
  { key: "Code",       label: "Code" },
  { key: "AI",         label: "AI" },
  { key: "Leadership", label: "Leadership" },
];

