"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { projects } from "@/data/projects";
import { smoothScrollTo } from "@/components/animation/lenisInstance";
import { cn } from "@/lib/utils";

export function FeaturedWork() {
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
          aria-label={scrolled ? "Scroll to top" : "Scroll to recent work"}
          className="absolute bottom-0 left-0 right-0 flex justify-center items-center w-10 h-8 hover:h-10 text-black bg-white/70 backdrop-blur-md rounded-sm rounded-br-none rounded-bl-none cursor-pointer transition-[height] duration-[180ms] ease-out hover:text-accent"
        >
          <div className="relative h-5 w-5">
            {/* Up arrow — slides in from below when scrolled */}
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-[transform,opacity] duration-[120ms] ease-out",
                scrolled ? "translate-y-0 opacity-100" : "translate-y-[7px] opacity-0"
              )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 9l-6-6-6 6" />
                <path d="M12 3v14" />
                <path d="M5 21h14" />
              </svg>
            </div>

            {/* Boat — slides out upward when scrolled; floats when visible */}
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-[transform,opacity] duration-[120ms] ease-out",
                scrolled ? "-translate-y-[5px] opacity-0" : "translate-y-0 opacity-100"
              )}
            >
              <div className={cn(!scrolled && "animate-boat-float")}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 10.189V14" />
                  <path d="M12 2v3" />
                  <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" />
                  <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76" />
                  <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                </svg>
              </div>
            </div>
          </div>
        </button>
      </div>

      <section className="relative z-10 p-8 py-16 bg-white/70 backdrop-blur-md">
        <div className="flex items-baseline justify-between max-w-7xl">
          <h2 className="text-2xl md:text-3xl font-semibold text-black tracking-tight">
            Recently shipped
          </h2>
          <Link
            href="/work"
            className="font-mono text-xs uppercase tracking-widest text-black/60 hover:text-accent"
          >
            <span className="inline-flex items-center gap-1">All work <ArrowRight size={12} strokeWidth={1.5} /></span>
          </Link>
        </div>

        <ul className="mt-10 grid gap-4 md:grid-cols-3 max-w-7xl">
          {featured.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/work/${p.slug}`}
                className="group block rounded-lg border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
              >
                <div className="font-mono text-xs text-black/60">{p.year}</div>
                <div className="mt-4 text-xl font-medium">{p.title}</div>
                <div className="mt-2 text-sm text-black/60">{p.summary}</div>
                <div className="mt-6 font-mono text-xs text-black/60 group-hover:text-accent">
                  <span className="inline-flex items-center gap-1">Read <ArrowRight size={12} strokeWidth={1.5} /></span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
