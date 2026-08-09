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
      <div className="mx-auto max-w-[1600px] pt-10 pb-24">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">
          <strong>IC</strong>x<strong>3</strong> (Design, Eng, Product)
        </h2>

        <div className="max-w-4xl space-y-6 text-lg leading-relaxed text-white/90">
          <p>I <strong>design</strong>, <strong>build</strong>, and <strong>grow</strong> digital products. A natural systems thinker, I recently built <ProjectLink slug="chisel" className="hover:text-white/60">Chisel, an agentic design system and prototyping tool</ProjectLink> that connects design, code, research, and analytics. Before that I redesigned <ProjectLink slug="figment-dapp" className="hover:text-white/60">Figment's staking dApp</ProjectLink> and grew it from 0 to <strong>$500M+</strong> in staked.</p>

          <p>A high-impact IC with a builder's mindset and experience leading design and engineering teams. I'm at home crafting UIs, interviewing customers, mapping business processes, shipping production code, facilitating collaborative workshops, or prototyping feature ideas.</p>
        </div>

        <div className="mt-16">
          <SkillsViz />
        </div>
      </div>
    </section>
  );
}
