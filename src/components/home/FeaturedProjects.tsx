import { ArrowRight } from "lucide-react";
import { featuredProjects } from "@/data/projects";
import { AllProjects } from "./AllProjects";

export function FeaturedProjects() {
  const featured = featuredProjects;

  return (
    <section
      id="projects"
      className="relative z-10 -mt-2 px-8 pt-16 bg-white/70 backdrop-blur-md"
    >
      <div className="flex items-baseline justify-between w-full max-w-[1600px]">
        <h2 className="text-2xl md:text-3xl font-semibold text-black tracking-tight">
          Recently shipped
        </h2>
      </div>

      <ul className="grid gap-8 md:grid-cols-3 max-w-[1600px] pt-8 pb-16">
        {featured.map((p) => {
          // No case study yet: the card keeps its art but doesn't link — the
          // "Read →" affordance becomes a "Coming soon" badge, and the hover
          // zoom / ring lift are dropped so it reads as inert.
          const Card = p.comingSoon ? "div" : "a";
          return (
            <li
              key={p.slug}
              className={
                p.comingSoon
                  ? "overflow-hidden rounded-2xl"
                  : "overflow-hidden rounded-2xl ring-0 ring-white/0 transition-[border-radius,box-shadow] duration-300 ease-[cubic-bezier(0.05,0,0,1)] hover:rounded-xl hover:ring-[10px] hover:ring-white/70"
              }
            >
              <Card
                {...(p.comingSoon ? {} : { href: `/#projects/${p.slug}` })}
                className="group relative block aspect-[16/10] bg-white/5"
              >
                {p.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumbnail}
                    alt=""
                    className={`absolute inset-0 h-full w-full object-cover ${
                      p.comingSoon
                        ? "opacity-85 saturate-75"
                        : "transition-transform duration-700 ease-[cubic-bezier(0.05,0,0,1)] group-hover:scale-[1.1]"
                    }`}
                  />
                )}

                {/* Scrim — heavier at bottom for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5" />

                {/* Content */}
                <div className="relative h-full p-5 flex flex-col justify-end">
                  <div className="text-xl font-semibold text-white leading-tight tracking-tight">
                    {p.title}
                  </div>
                  <div className="mt-1.5 text-sm text-white/60 leading-snug">
                    {p.summary}
                  </div>
                  {p.comingSoon ? (
                    <div className="mt-5 self-start rounded-full border border-accent/50 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-accent">
                      Coming soon
                    </div>
                  ) : (
                    <div className="mt-5 font-mono text-xs text-white/40 group-hover:text-accent transition-colors duration-150 inline-flex items-center gap-1">
                      Read <ArrowRight size={11} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <AllProjects />
    </section>
  );
}
