"use client";

import dynamic from "next/dynamic";
import { Hero } from "./Hero";
import { FeaturedWork } from "./FeaturedWork";

// Client-only islands: WebGL touches window; the synth panel hosts
// keyboard/IO handlers. Both import heavy deps, so we defer them.
const InteractiveBackground = dynamic(
  () => import("./InteractiveBackground").then((m) => m.InteractiveBackground),
  { ssr: false },
);

const SynthPanel = dynamic(
  () => import("./SynthPanel").then((m) => m.SynthPanel),
  { ssr: false },
);

export function HomeClient() {
  return (
    <>
      <InteractiveBackground />
      <Hero />
      <FeaturedWork />
      <SynthPanel />
    </>
  );
}
