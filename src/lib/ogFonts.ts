import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Satori needs static .ttf per weight (no woff2, no variable axes).
// next.config.ts traces these into the serverless bundle; don't move them.
const FONT_DIR = join(process.cwd(), "src/assets/fonts");

export type OgFont = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
};

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
