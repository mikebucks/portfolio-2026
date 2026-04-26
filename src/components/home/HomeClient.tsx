"use client";

import dynamic from "next/dynamic";
import { Hero } from "./Hero";
import { FeaturedWork } from "./FeaturedWork";
import { InteractiveBackground } from "./InteractiveBackground";

// SynthPanel still deferred — it pulls in Zustand and panel state.
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
