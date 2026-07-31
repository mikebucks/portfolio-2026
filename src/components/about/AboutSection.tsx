import { SkillsViz } from "@/components/skills/SkillsViz";

/**
 * About section on the homepage. Dark translucent panel so the existing
 * white-on-dark bio + SkillsViz colors stay legible over the shader behind it.
 */
export function AboutSection() {
  return (
    <section
      id="about"
      className="relative z-10 bg-[#08080a]/70 backdrop-blur-md"
    >
      <div className="max-w-[1600px] gutter-x pt-20 pb-24">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">
          About
        </h2>
        <p className="mb-10 font-mono text-xs uppercase tracking-widest text-white/60">
          <strong>IC</strong>x<strong>3</strong> (Design, Eng, Product)
        </p>

        <div className="max-w-4xl space-y-6 text-lg leading-relaxed text-white/90">
          <p>High impact IC with a builder's mindset. I <strong>design</strong>, <strong>engineer</strong>, <strong>strategize</strong>, and <strong>grow</strong> digital products. A natural systems thinker, I understand how the design system, the codebase, the metrics, and the customer conversations relate, and I build the infrastructure to connect them and help teams move faster. I'm equally comfortable crafting UIs, interviewing customers, mapping business processes, shipping production code, or prototyping novel solutions.</p>

          <p>Lately I'm focused on building agentic systems. I built <a className="text-accent hover:text-white/60" href="/#projects/chisel">Chisel, a design system that turns a prompt into production code</a>, Claude Code skills wired into a real CI pipeline. Before that I redesigned <a className="text-accent hover:text-white/60" href="/#projects/chisel">Figment's staking dApp and grew it from roughly $0 to $500M+ in staked assets</a>.</p>
        </div>

        <div className="mt-16">
          <SkillsViz />
        </div>
      </div>
    </section>
  );
}
