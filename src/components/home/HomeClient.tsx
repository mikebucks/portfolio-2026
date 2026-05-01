"use client";

import { Hero } from "./Hero";
import { FeaturedWork } from "./FeaturedWork";
import { InteractiveBackground } from "./InteractiveBackground";


export function HomeClient() {
  return (
    <div className="">
      <InteractiveBackground />
      <Hero />
      <FeaturedWork />
    </div>
  );
}
