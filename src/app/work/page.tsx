import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { projects } from "@/data/projects";

export const metadata: Metadata = {
  title: "Work — Portfolio",
  description: "Selected projects.",
};

export default function WorkIndexPage() {
  return (
    <section className="w-full max-w-[1600px] px-8 pt-32 pb-24">
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
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-6 py-6 transition-colors hover:bg-white/[0.02]"
            >
              <div
                className="h-16 w-24 shrink-0 overflow-hidden rounded bg-white/5"
                style={
                  p.thumbnail
                    ? {
                        background: `url(${p.thumbnail}) center / cover no-repeat`,
                      }
                    : undefined
                }
              />
              <div>
                <div className="text-xl md:text-2xl font-medium">
                  {p.title}
                </div>
                <div className="mt-1 text-sm text-white/60">
                  {p.summary}
                </div>
              </div>
              <div className="font-mono text-xs text-white/60 group-hover:text-accent inline-flex items-center gap-1">
                Read <ArrowRight size={12} strokeWidth={1.5} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
