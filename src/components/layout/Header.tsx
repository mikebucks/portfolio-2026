"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SynthToggleButton } from "../audio/SynthToggleButton";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // SynthPanel still deferred — it pulls in Zustand and panel state.
  const SynthPanel = dynamic(
    () => import("../audio/SynthPanel").then((m) => m.SynthPanel),
    { ssr: false },
  );


  return (
    <>
      <SynthPanel />
      {/* Rendered at z-29 so the header's mix-blend-difference blends against it */}
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-[29] bg-black/60 backdrop-blur-md transition-[opacity, h] duration-200 pointer-events-none",
          scrolled ? "h-15 opacity-100" : "h-19 opacity-0"
        )}
        aria-hidden="true"
      />
      <header className={cn(
        "fixed inset-x-0 top-0 z-30 flex items-center justify-between w-full max-w-7xl px-8 mix-blend-difference transition-[p, pb] duration-400",
        scrolled ? "pt-6 pb-4" : "pt-8 pb-6"
      )}>
        <section className="flex justify-between w-full">
          <Link
            href="/"
            className="font-mono text-sm tracking-tight text-white hover:text-accent"
          >
            Mike<span className="font-bold">Bucks</span>
          </Link>
          <div className="flex justify-between gap-6 items-center">
            <nav aria-label="Primary">
              <ul className="flex items-center gap-6 font-mono text-xs uppercase tracking-widest text-white/80">
                <li>
                  <Link href="/work" className="hover:text-accent">
                    Work
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-accent">
                    About
                  </Link>
                </li>
                <li>
                  <a href="mailto:hello@example.com" className="hover:text-accent">
                    Contact
                  </a>
                </li>
                <li> 
                  <SynthToggleButton />
                </li>
              </ul>
            </nav>
          </div>
        </section>
      </header>
    </>
  );
}
