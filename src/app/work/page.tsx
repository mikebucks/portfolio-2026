import Link from "next/link";
import type { Metadata } from "next";
import { projects } from "@/data/projects";

export const metadata: Metadata = {
  title: "Work — Portfolio",
  description: "Selected projects.",
};

export default function WorkIndexPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 pt-32 pb-24">
      <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
        Work
      </h1>
      <p className="mt-4 max-w-xl text-white/60">
        Selected projects across product design, interactive systems, and
        creative technology.
      </p>

      <ul className="mt-16 divide-y divide-white/10 border-y border-white/10">
        {projects.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/work/${p.slug}`}
              className="group grid grid-cols-[1fr_auto] items-baseline gap-6 py-6 transition-colors hover:bg-white/[0.02]"
            >
              <div>
                <div className="text-xl md:text-2xl font-medium">
                  {p.title}
                </div>
                <div className="mt-1 text-sm text-white/60">
                  {p.summary}
                </div>
              </div>
              <div className="font-mono text-xs text-white/60 group-hover:text-accent">
                {p.year} →
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
