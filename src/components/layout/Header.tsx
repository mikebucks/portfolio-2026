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
      <header className={cn(
        "fixed inset-x-0 top-0 z-30 flex items-center justify-between w-full max-w-[1600px] px-8 backdrop-blur-sm transition-all duration-400",
        scrolled ? "py-4 bg-cream" : "pt-8 pb-6 bg-white/60"
      )}>
        <section className="flex justify-between w-full">
          <Link
            href="/"
            className="font-mono text-sm tracking-tight text-black hover:text-accent"
          >
            Mike<span className="font-bold">Bucks</span>
          </Link>
          <div className="flex justify-between gap-6 items-center">
            <nav aria-label="Primary">
              <ul className="flex items-center gap-6 font-mono text-xs uppercase tracking-widest text-black/80">
                <li>
                  <Link href="/projects" className="hover:text-accent">
                    Projects
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
