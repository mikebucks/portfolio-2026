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
      <div className="max-w-[1600px] px-8 pt-20 pb-24">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">
          About
        </h2>
        <p className="mb-10 font-mono text-xs uppercase tracking-widest text-white/60">
          <strong>IC</strong>x<strong>3</strong> (Design, Eng, Product)
        </p>

        <div className="max-w-4xl space-y-6 text-lg leading-relaxed text-white/90">
          <p>Design leader with a builder's mindset and skills to match. I've been designing, engineering, and strategizing digital products for 20 years. My diverse experience and skills have given me the flexibility to operate at any level of the product stack. I'm perfectly positioned to help your I’m perfectly positioned to help Engineering, Product, and Design orgs take full advantage of the LLM boom.</p>
        </div>

        <div className="mt-16">
          <SkillsViz />
        </div>
      </div>
    </section>
  );
}
