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
      className="relative z-10 gutter-x bg-ink/90 backdrop-blur-md"
    >
      <div className="mx-auto max-w-[1600px] pt-10 pb-24">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">
          <strong>IC</strong>x<strong>3</strong> (Design, Eng, Product)
        </h2>

        <div className="max-w-4xl space-y-6 text-lg leading-relaxed text-white/90">
          <p>I <strong>design</strong>, <strong>build</strong>, and <strong>grow</strong> digital products that move businesses and teams forward. Lately I've been extending design systems with MCP tooling, giving AI agents context that lives outside the design org.</p> 
          
          <p>Naturally a systems thinker, I recently built <ProjectLink slug="chisel" className="hover:text-white/60 underline decoration-white/20 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent">Chisel, an agentic design system and prototyping tool</ProjectLink> that connects design, code, research, and analytics. Before that, I redesigned <ProjectLink slug="figment-dapp" className="hover:text-white/60 underline decoration-white/20 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent">Figment's staking dApp</ProjectLink> and grew it to over <strong>$500M</strong> in staked Ethereum.</p>

          <p>I'm a high-impact IC with a builder's mindset + experience leading and scaling design and engineering teams. I'm at home crafting UIs, interviewing customers, mapping business processes, shipping production code, facilitating collaborative workshops, or prototyping feature ideas.</p>
        </div>

        <div className="mt-16">
          <SkillsViz />
        </div>
      </div>
    </section>
  );
}
