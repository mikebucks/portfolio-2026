"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Rendered at z-29 so the header's mix-blend-difference blends against it */}
      <div
        className="fixed inset-x-0 top-0 z-[29] h-19 bg-black/75 backdrop-blur-md transition-opacity duration-600 pointer-events-none"
        style={{ opacity: scrolled ? 1 : 0 }}
        aria-hidden="true"
      />
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between p-8 pb-6 mix-blend-difference">
        <section className="flex justify-between w-full max-w-7xl">
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
              </ul>
            </nav>
          </div>
        </section>
      </header>
    </>
  );
}
