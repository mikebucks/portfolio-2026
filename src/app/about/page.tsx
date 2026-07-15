import type { Metadata } from "next";
import { SkillsViz } from "@/components/skills/SkillsViz";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "About — Portfolio",
  description: "Short bio, capabilities, and contact.",
};

export default function AboutPage() {
  return (
    <>
      <PageHeader title="About">
      </PageHeader>
      <section className="max-w-[1600px] px-8 pt-16 pb-24">
        <div className="">
          <h2 className="font-mono text-xs uppercase tracking-widest text-white/60 mb-8">
            Born for such a time as this
          </h2>
        </div>
        <div className="space-y-6 text-lg leading-relaxed text-white/90 max-w-4xl">
          <p>
            My M.O. has always been to master as much of the product stack as possible. Starting my career as a UI Designer, I figured out coding my own designs was the best way to ship great work. That realization led me on a decade-long tour as an Engineer, Creative Technologist, and Technical Lead where I built apps and sites for some of the largest brands in the world.
          </p>
          <p>
            I've since returned to the design world, most recently leading Product Design at Figment, the world's largest proof-of-stake crypto infrastructure company. Over the better part of 4 years, I grew a self-serve staking product from zero to over <strong>$500,000,000</strong> of Ethereum staked as the sole designer for a decentralized app experience. All while serving Figment's institutional customers and their ~<strong>$18,000,000,000</strong> worth of crypto staked to Figment's network of validators.
          </p>
          <p>
            My unique tenure has positioned me perfectly to take advantage of the LLM boom. I'm not vibe-coding/designing/researching. I'm orchestrating agents to build complex systems in a fraction of the time it used to take. 
          </p>
        </div>

        <div className="mt-16">
          <SkillsViz />
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
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
    </>
  );
}
