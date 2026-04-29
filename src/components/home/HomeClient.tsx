"use client";

import dynamic from "next/dynamic";
import { Hero } from "./Hero";
import { FeaturedWork } from "./FeaturedWork";
import { InteractiveBackground } from "./InteractiveBackground";
import { InlineHighlight } from "@/components/ui/InlineHighlight";

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
      {/* <div className="mt-8 max-w-xl">
        <p
          data-intro="lede-tag"
          className="font-mono text-xs uppercase tracking-[0.1em]"
        >
          <InlineHighlight>Just Shipped</InlineHighlight>
        </p>

        <p
          data-intro="lede"
          className="text-lg leading-[1.3]"
        >
          <InlineHighlight>More than a design system, Chisel is a product design assistant allowing anyone to create high craft UI prototypes.</InlineHighlight>
        </p>
      </div> */}
      <FeaturedWork />
      <SynthPanel />
    </>
  );
}
