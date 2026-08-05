import { ProjectLink } from "@/components/projects/ProjectLink";
import { SkillsViz } from "@/components/skills/SkillsViz";

/**
 * About section on the homepage. Dark translucent panel so the existing
 * white-on-dark bio + SkillsViz colors stay legible over the shader behind it.
 */
export function AboutSection() {
  return (
    <section
      id="about"
      className="relative z-10 gutter-x bg-[#08080a]/70 backdrop-blur-md"
    >
      {/* gutter-x sits on the section so the panel background stays full bleed;
          the cap and the centering ride on the inner column. Keeping the two on
          separate elements is what lines this section's left edge up with the
          others past 1600px — with both on one box the padding would eat into
          the cap and inset the text by an extra gutter. */}
      <div className="mx-auto max-w-[1600px] pt-10 pb-24">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">
          <strong>IC</strong>x<strong>3</strong> (Design, Eng, Product)
        </h2>
        {/* <p className="mb-10 font-mono text-xs uppercase tracking-widest text-white/60">
          
        </p> */}

        <div className="max-w-4xl space-y-6 text-lg leading-relaxed text-white/90">
          <p>High impact IC with a builder's mindset. I <strong>design</strong>, <strong>engineer</strong>, <strong>strategize</strong>, and <strong>grow</strong> digital products. A natural systems thinker, I understand how design systems, codebases, metrics, and business needs relate to one another. I love building infrastructure connecting them. I'm equally comfortable crafting UIs, interviewing customers, mapping business processes, shipping production code, or prototyping novel feature concepts.</p>

          <p>Lately I'm focused on building agentic systems. I built <ProjectLink slug="chisel" className="underline hover:text-white/60">Chisel, a design system that turns a prompt into production code</ProjectLink>, Claude Code skills wired into a real CI pipeline. Before that I redesigned <ProjectLink slug="figment-dapp" className="underline hover:text-white/60">Figment's staking dApp and grew it from roughly $0 to $500M+ in staked assets</ProjectLink> on a team of 2, myself and a PM.</p>
        </div>

        <div className="mt-16">
          <SkillsViz />
        </div>
      </div>
    </section>
  );
}
