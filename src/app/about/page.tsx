import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Portfolio",
  description: "Short bio, capabilities, and contact.",
};

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 pt-32 pb-24">
      <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
        About
      </h1>
      <div className="mt-10 space-y-6 text-lg leading-relaxed text-white/90">
        <p>
          I design and build digital products. I care about clarity, craft, and
          the small moments of friction that separate a good interface from a
          great one.
        </p>
        <p>
          My work sits at the seam between design and engineering — systems
          thinking, prototype-driven design, and the occasional shader.
        </p>
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
            <li>Prototyping</li>
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
