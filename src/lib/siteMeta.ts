// Shared by metadata, OG images, sitemap, robots and manifest.
export const SITE = {
  url: "https://mikebucks.me",
  name: "Mike Bucks",
  title: "Digital Product Builder",
  description:
    "2026 portfolio. Interfaces, systems, and the occasional audiovisual instrument.",
  author: "Mike Bucks",
} as const;

/** Must match globals.css. */
export const OG = {
  cream: "#f4f1ea",
  ink: "#111111",
  accent: "#ff5f15",
  size: { width: 1200, height: 630 },
  contentType: "image/png",
} as const;
