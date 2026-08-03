/**
 * Single source of truth for the site's identity — shared by the root metadata,
 * the generated OG images, the sitemap, robots and the web manifest, so the
 * domain and the strings people see when a link is pasted can't drift apart.
 */
export const SITE = {
  url: "https://mikebucks.me",
  name: "Mike Bucks",
  title: "Mike Bucks Portfolio 2026",
  description:
    "Design-engineering portfolio. Interfaces, systems, and the occasional audiovisual instrument.",
  author: "Mike Bucks",
} as const;

/** Design tokens the OG images share with globals.css. */
export const OG = {
  cream: "#f4f1ea",
  ink: "#111111",
  accent: "#ff5f15",
  size: { width: 1200, height: 630 },
  contentType: "image/png",
} as const;
