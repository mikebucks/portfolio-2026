import type { Metadata } from "next";
import { SkillsViz } from "@/components/skills/SkillsViz";

export const metadata: Metadata = {
  title: "About — Portfolio",
  description: "Short bio, capabilities, and contact.",
};

export default function AboutPage() {
  return (
    <section className="max-w-[1600px] px-8 pt-32 pb-24">
      <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
        About
      </h1>
      <div className="mt-10 space-y-6 text-lg leading-relaxed text-white/90 max-w-4xl">
        <p>
          I've been hopping between strategy, design, and code for
          over twenty years. I'm able to own research, craft, and frontend engineering end
          to end. In this golden age of agentic workflows, that breadth lets me
          build faster and better products at a fraction of the resources they once took.
        </p>
        <p>
          Most recently I led product design at Figment, growing a self-serve
          staking product from zero to over <strong>$500M</strong> in assets under stake in 14
          months as the sole designer for the entire experience. I also built
          Chisel — a design infrastructure tool that moves design from a step
          in the process available to a select few, to a layer any engineer in
          the org can use.
        </p>
        <p>
          My work lives at the seam between design and engineering: systems
          thinking, prototype-driven iteration, and the occasional shader.
        </p>
      </div>

      <div className="mt-16">
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/60 mb-8">
          Skills
        </h2>
        <SkillsViz />
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-white/60">
            Capabilities
          </h2>
          <ul className="mt-4 space-y-1">
            <li>Product & interaction design</li>
            <li>Design systems</li>
            <li>Frontend engineering</li>
            <li>Creative technology & WebGL</li>
            <li>Prototyping & agentic workflows</li>
          </ul>
        </div>
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-white/60">
            Contact
          </h2>
          <ul className="mt-4 space-y-1">
            <li>
              <a
                className="underline decoration-white/20 underline-offset-4 hover:decoration-accent"
                href="mailto:hello@example.com"
              >
                hello@example.com
              </a>
            </li>
            <li>
              <a
                className="underline decoration-white/20 underline-offset-4 hover:decoration-accent"
                href="https://read.cv"
                target="_blank"
                rel="noreferrer"
              >
                read.cv
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
