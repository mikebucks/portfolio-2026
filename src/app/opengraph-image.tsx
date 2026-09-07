import { ImageResponse } from "next/og";
import { OgCard } from "@/components/og/OgCard";
import { OG, SITE } from "@/lib/siteMeta";
import { loadOgFonts } from "@/lib/ogFonts";

// Site-wide OG card; supplies openGraph.images for every route without an override.
export const alt = SITE.title;
export const size = OG.size;
export const contentType = OG.contentType;

export default async function OpengraphImage() {
  return new ImageResponse(
    <OgCard title={SITE.title} description={SITE.description} />,
    { ...size, fonts: await loadOgFonts() },
  );
}
