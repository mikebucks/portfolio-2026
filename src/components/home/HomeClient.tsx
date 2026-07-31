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
      {/* Everything except the shader and the modal itself. Scales down and
          fades out while a project is open (see the [data-modal-hide] rules in
          globals.css) so the translucent panel has only the shader behind it.
          The wrapper is layout-neutral and rests at opacity 1 with no
          transform — either would open a stacking context and break the hero's
          mix-blend-difference against the shader. */}
      <div data-modal-hide="page">
        <Hero />
        <FeaturedProjects />
        <AboutSection />
        <ContactSection />
      </div>
      <ProjectModal />
      <IntroSequence />
    </div>
  );
}
