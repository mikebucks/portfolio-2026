"use client";

import { Hero } from "./Hero";
import { FeaturedProjects } from "./FeaturedProjects";
import { InteractiveBackground } from "./InteractiveBackground";


export function HomeClient() {
  return (
    <div className="">
      <InteractiveBackground />
      <Hero />
      <FeaturedProjects />
    </div>
  );
}
