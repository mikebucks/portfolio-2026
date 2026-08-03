import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Inter for the generated OG cards.
 *
 * Satori (what next/og renders with) ships a single regular-weight fallback and
 * silently ignores `fontWeight`, so without these the wordmark and headlines
 * render flat. It also can't read the .woff2 files next/font already produces,
 * and applies variable-font axes unreliably — hence two static .ttf instances
 * vendored under src/assets/fonts.
 *
 * These are read at build time, not served, so they live outside public/.
 * next.config.ts traces them into the serverless bundle explicitly; without
 * that the read succeeds locally and fails on a deployed on-demand render.
 */
const FONT_DIR = join(process.cwd(), "src/assets/fonts");

export type OgFont = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
};

// Module-scope cache: a build renders one card per project, and re-reading
// 650KB from disk for each is pure waste.
let cached: OgFont[] | null = null;

export async function loadOgFonts(): Promise<OgFont[]> {
  if (cached) return cached;

  const [regular, bold] = await Promise.all([
    readFile(join(FONT_DIR, "Inter-Regular.ttf")),
    readFile(join(FONT_DIR, "Inter-Bold.ttf")),
  ]);

  cached = [
    { name: "Inter", data: regular, weight: 400, style: "normal" },
    { name: "Inter", data: bold, weight: 700, style: "normal" },
  ];
  return cached;
}
