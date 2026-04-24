import Link from "next/link";
import { projects } from "@/data/projects";

export function FeaturedWork() {
  const featured = projects.slice(0, 3);
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-6 py-24 md:px-10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Selected work
        </h2>
        <Link
          href="/work"
          className="font-mono text-xs uppercase tracking-widest text-white/60 hover:text-accent"
        >
          All work →
        </Link>
      </div>

      <ul className="mt-10 grid gap-4 md:grid-cols-3">
        {featured.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/work/${p.slug}`}
              className="group block rounded-lg border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
            >
              <div className="font-mono text-xs text-white/60">
                {p.year}
              </div>
              <div className="mt-4 text-xl font-medium">{p.title}</div>
              <div className="mt-2 text-sm text-white/60">
                {p.summary}
              </div>
              <div className="mt-6 font-mono text-xs text-white/60 group-hover:text-accent">
                Read →
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
