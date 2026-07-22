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
          <p>
            My M.O. has always been to master as much of the product stack as
            possible. Starting my career as a UI Designer, I figured out coding
            my own designs was the best way to ship great work. That realization
            led me on a decade-long tour as a <strong>Frontend Engineer</strong>, <strong>Creative Technologist</strong>,
            and <strong>Technical Lead</strong> where I built apps and sites for some of the
            largest brands in the world.
          </p>
          <p>
            I&apos;ve since returned to the design world, most recently leading
            Product Design at Figment, the world&apos;s largest proof-of-stake
            crypto infrastructure company. Over the better part of 4 years, I
            grew a self-serve staking product from zero to over{" "}
            <strong>$500M</strong> of Ethereum staked as the sole designer
            for a decentralized app experience. All while serving Figment&apos;s
            institutional customers, building financial analysis dashboards to serve their ~<strong>$18B</strong>{" "}
            worth of crypto staked to Figment&apos;s network of validators.
          </p>
          <p>
            My unique tenure has positioned me perfectly to take advantage of the
            LLM boom. I&apos;m not vibe-coding/designing/researching. I&apos;m
            orchestrating agents to build complex systems in a fraction of the
            time it used to take.
          </p>
        </div>

        <div className="mt-16">
          <SkillsViz />
        </div>
      </div>
    </section>
  );
}
