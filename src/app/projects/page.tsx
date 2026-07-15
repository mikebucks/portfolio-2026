import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { projects } from "@/data/projects";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "Projects — Portfolio",
  description: "Selected projects.",
};

export default function ProjectsIndexPage() {
  return (
    <>
      <PageHeader title="Projects">
        <p className="max-w-xl text-white/80">
          Selected projects across product design, interactive systems, and
          creative technology.
        </p>
      </PageHeader>

      <section className="w-full max-w-[1600px] px-8 pt-16 pb-24">
      <ul className="divide-y divide-white/10 border-y border-white/10">
        {projects.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/projects/${p.slug}`}
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
    </>
  );
}
