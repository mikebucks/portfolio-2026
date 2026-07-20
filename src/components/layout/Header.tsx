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
  const [activeId, setActiveId] = useState<string | null>(null);
  const pathname = usePathname();
  const onHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy: highlight the nav item whose section is crossing the viewport's
  // vertical center. Only runs on the homepage, where the sections live.
  useEffect(() => {
    if (!onHome) {
      setActiveId(null);
      return;
    }

    const sections = NAV_LINKS.map((link) =>
      document.getElementById(link.id),
    ).filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    // A section counts as "active" only while it intersects the horizontal
    // center line of the viewport (the -50%/-50% margins collapse the root to
    // that line), so at most one section is active at a time. We track the set
    // of intersecting sections so that scrolling above all of them (into the
    // hero) clears the active id instead of leaving the last one stuck on.
    const intersecting = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) intersecting.add(entry.target.id);
          else intersecting.delete(entry.target.id);
        }
        // Preserve document order so the highest visible section wins.
        const next = NAV_LINKS.find((link) => intersecting.has(link.id));
        setActiveId(next?.id ?? null);
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [onHome]);

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
                      aria-current={activeId === link.id ? "true" : undefined}
                      className={cn(
                        "hover:text-accent transition-colors",
                        activeId === link.id && "active text-accent",
                      )}
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
