"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { projects } from "@/data/projects";
import { smoothScrollTo } from "@/components/animation/lenisInstance";
import { cn } from "@/lib/utils";

export function FeaturedProjects() {
  const featured = projects.slice(0, 3);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleToggle = () => {
    const target = scrolled ? 0 : window.innerHeight;
    smoothScrollTo(target);
  };

  return (
    <div className="-mt-10">
      {/* Wrapper holds layout height; button is absolutely anchored to bottom and grows upward on hover */}
      <div className="relative z-20 h-8 mx-auto w-10">
        <button
          type="button"
          onClick={handleToggle}
          aria-label={scrolled ? "Scroll to top" : "Scroll to recent projects"}
          className="absolute bottom-0 left-0 right-0 flex justify-center items-center w-10 h-9 hover:h-12 text-black/80 bg-accent/70 backdrop-blur-md rounded-full rounded-br-none rounded-bl-none cursor-pointer transition-[height] duration-[180ms] ease-out hover:bg-accent"
        >
          <div className="relative h-5 w-5">
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-[transform,opacity] duration-[120ms] delay-[250ms] ease-out",
                scrolled ? "translate-y-0 opacity-100" : "translate-y-[8px] opacity-0"
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 9l-6-6-6 6" /><path d="M12 3v14" /><path d="M5 21h14" />
              </svg>
            </div>
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-[transform,opacity] duration-[120ms] delay-[250ms] ease-out",
                scrolled ? "-translate-y-[8px] opacity-0" : "translate-y-[5px] opacity-100"
              )}
            >
              <div className={cn(!scrolled && "animate-boat-float")}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 10.189V14" /><path d="M12 2v3" />
                  <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" />
                  <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76" />
                  <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                </svg>
              </div>
            </div>
          </div>
        </button>
      </div>

      <section className="relative z-10 bg-white/70 backdrop-blur-md">
        <div className="flex items-baseline justify-between max-w-[1600px] px-8 pt-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-black tracking-tight">
            Recently shipped
          </h2>
          <Link href="/projects" className="font-mono text-xs uppercase tracking-widest text-black/60 hover:text-accent">
            <span className="inline-flex items-center gap-1">All projects <ArrowRight size={12} strokeWidth={1.5} /></span>
          </Link>
        </div>

        <ul className="grid gap-8 md:grid-cols-3 max-w-[1600px] p-8 pb-16">
          {featured.map((p) => (
            <li
              key={p.slug}
              className="overflow-hidden rounded-2xl ring-0 ring-white/0 transition-[border-radius,box-shadow] duration-300 ease-[cubic-bezier(0.05,0,0,1)] hover:rounded-xl hover:ring-[10px] hover:ring-white/70"
            >
              <Link
                href={`/projects/${p.slug}`}
                className="group relative block aspect-[16/10] bg-white/5"
              >
                {p.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumbnail}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.05,0,0,1)] group-hover:scale-[1.1]"
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
                  <div className="mt-5 font-mono text-xs text-white/40 group-hover:text-accent transition-colors duration-150 inline-flex items-center gap-1">
                    Read <ArrowRight size={11} strokeWidth={1.5} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
