"use client";

import { Hero } from "./Hero";
import { FeaturedProjects } from "./FeaturedProjects";
import { InteractiveBackground } from "./InteractiveBackground";
import { IntroSequence } from "./IntroSequence";
import { AboutSection } from "@/components/about/AboutSection";
import { ContactSection } from "@/components/contact/ContactSection";
import { ProjectModal } from "@/components/projects/ProjectModal";
import { useHashScroll } from "@/components/animation/useHashScroll";

export function HomeClient() {
  useHashScroll();

  return (
    <div className="">
      <InteractiveBackground />
      <Hero />
      <FeaturedProjects />
      <AboutSection />
      <ContactSection />
      <ProjectModal />
      <IntroSequence />
    </div>
  );
}
