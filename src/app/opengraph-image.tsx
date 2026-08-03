import { ImageResponse } from "next/og";
import { OgCard } from "@/components/og/OgCard";
import { OG, SITE } from "@/lib/siteMeta";
import { loadOgFonts } from "@/lib/ogFonts";

// Site-wide link preview. This file convention also supplies `openGraph.images`
// (and twitter:image) for every route that doesn't override it, so `/`, /about,
// /projects and /contact all share this card.
export const alt = SITE.title;
export const size = OG.size;
export const contentType = OG.contentType;

export default async function OpengraphImage() {
  return new ImageResponse(
    <OgCard title={SITE.title} description={SITE.description} />,
    { ...size, fonts: await loadOgFonts() },
  );
}
