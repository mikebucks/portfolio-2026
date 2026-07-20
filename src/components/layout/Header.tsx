"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { smoothScrollTo } from "@/components/animation/lenisInstance";
// import { SynthToggleButton } from "../audio/SynthToggleButton";

const NAV_LINKS = [
  { id: "projects", label: "Projects" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const onHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // On the homepage, intercept the section links to smooth-scroll in-page and
  // keep the hash shareable. On other routes, fall through to a normal
  // navigation to /#section — the homepage then scrolls to it on load.
  const handleSectionClick =
    (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!onHome) return;
      e.preventDefault();
      smoothScrollTo(`#${id}`);
      history.pushState(null, "", `#${id}`);
    };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onHome) return;
    e.preventDefault();
    smoothScrollTo(0);
    history.pushState(null, "", "/");
  };

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
            onClick={handleLogoClick}
            className="font-mono text-sm tracking-tight text-black hover:text-accent"
          >
            Mike<span className="font-bold">Bucks</span>
          </Link>
          <div className="flex justify-between gap-6 items-center">
            <nav aria-label="Primary">
              <ul className="flex items-center gap-6 font-mono text-xs uppercase tracking-widest text-black/80">
                {NAV_LINKS.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={`/#${link.id}`}
                      onClick={handleSectionClick(link.id)}
                      className="hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {/* <li>
                  <SynthToggleButton />
                </li> */}
              </ul>
            </nav>
          </div>
        </section>
      </header>
    </>
  );
}
