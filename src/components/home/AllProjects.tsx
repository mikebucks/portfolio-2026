import { ArrowRight } from "lucide-react";
import { projects } from "@/data/projects";

/**
 * Full project index, rendered on the light "Recently shipped" panel below the
 * featured cards. Each row deep-links to the hash-routed project modal.
 */
export function AllProjects() {
  return (
    <div className="max-w-[1600px] pb-20">
      <h2 className="mb-6 font-mono text-xs uppercase tracking-widest text-black/60">
        All projects
      </h2>
      <ul className="divide-y divide-black/10 border-y border-black/10">
        {projects.map((p) => (
          <li key={p.slug}>
            <a
              href={`/#projects/${p.slug}`}
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-6 py-6 transition-colors hover:bg-black/[0.02]"
            >
              <div
                className="h-16 w-24 shrink-0 overflow-hidden rounded bg-black/5"
                style={
                  p.thumbnail
                    ? {
                        background: `url(${p.thumbnail}) center / cover no-repeat`,
                      }
                    : undefined
                }
              />
              <div>
                <div className="text-xl md:text-2xl font-medium text-black">
                  {p.title}
                </div>
                <div className="mt-1 text-sm text-black/60">{p.summary}</div>
              </div>
              <div className="inline-flex items-center gap-1 font-mono text-xs text-black/60 group-hover:text-accent">
                Read <ArrowRight size={12} strokeWidth={1.5} />
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
