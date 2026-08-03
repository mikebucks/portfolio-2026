"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { smoothScrollTo } from "@/components/animation/lenisInstance";
import { isHomeUrl, navigate } from "@/lib/appRoute";
import { SynthToggleButton } from "../audio/SynthToggleButton";

const NAV_LINKS = [
  { id: "projects", label: "Projects" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

// SynthPanel still deferred (it pulls in Zustand + panel state), but defined at
// module scope: creating it inside the component re-created the lazy identity on
// every Header render (scroll + active-nav changes), remounting the panel each
// time.
const SynthPanel = dynamic(
  () => import("../audio/SynthPanel").then((m) => m.SynthPanel),
  { ssr: false },
);

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  // Every homepage URL (`/`, `/projects`, `/about`, `/contact`,
  // `/projects/<slug>`) renders this same tree, so the in-page behaviours below
  // stay live as the path changes underneath them.
  const onHome = isHomeUrl(pathname);

  // Publish the bar's rendered height as --header-h so fixed overlays (the
  // synth panel) can start below the nav instead of on top of it. It isn't a
  // constant — the scroll state swaps the padding, and it animates — so
  // observe it rather than measuring once.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty(
        "--header-h",
        `${el.offsetHeight}px`,
      );
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  // Intercept the section links to smooth-scroll in-page and push the matching
  // path, so the URL stays shareable without a route change. Modified clicks
  // (new tab / window) and any future non-homepage route fall through to a real
  // navigation — /projects and friends serve the homepage and scroll to the
  // section on load.
  const handleSectionClick =
    (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!onHome) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      smoothScrollTo(`#${id}`);
      navigate(`/${id}`);
    };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onHome) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    smoothScrollTo(0);
    navigate("/");
  };

  return (
    // top offset by safe-area-inset-top (viewport-fit=cover): sit the nav below
    // the notch / cream status-bar frame bar. Zero on desktop, so unchanged there.
    <header
      ref={headerRef}
      data-intro-header
      style={{ top: "env(safe-area-inset-top, 0px)" }}
      // Transition only the scroll-state properties (padding + background), NOT
      // `all`: the intro flies the header in with a GSAP transform, and a CSS
      // transition on `transform` would fight GSAP's per-frame writes.
      className={cn("fixed z-30 w-full gutter-x backdrop-blur-sm transition-[background-color,padding] duration-400",
      scrolled ? "py-4 bg-cream" : "pt-8 pb-6 bg-white/60")}>
      {/* Contents fade out behind the translucent project modal; the bar's own
          background is cleared by the same rules. Kept off the <header>
          element so GSAP's intro autoAlpha tween owns its opacity alone.
          See globals.css. */}
      <div data-modal-hide>
        <SynthPanel />
        <div className={
          "flex items-center justify-between inset-x-0 w-full max-w-[1600px]"
        }>
          <section className="flex justify-between w-full">
            {/* Plain anchors, not next/link: each of these paths is its own
                Next route serving the whole homepage, so Link would prefetch a
                duplicate page payload per nav item for a navigation we always
                intercept. The href still carries the real URL for middle-click
                and "copy link address". */}
            <a
              href="/"
              onClick={handleLogoClick}
              className="font-mono text-sm tracking-tight text-black hover:text-accent"
            >
              Mike<span className="font-bold">Bucks</span>
            </a>
            <div className="flex justify-between gap-6 items-center">
              <nav aria-label="Primary">
                <ul className="flex items-center gap-6 font-mono text-xs uppercase tracking-widest text-black/80">
                  {NAV_LINKS.map((link) => (
                    <li key={link.id}>
                      <a
                        href={`/${link.id}`}
                        onClick={handleSectionClick(link.id)}
                        aria-current={activeId === link.id ? "true" : undefined}
                        className={cn(
                          "hover:text-accent transition-colors",
                          activeId === link.id && "active text-accent",
                        )}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                  <li>
                    <SynthToggleButton />
                  </li>
                </ul>
              </nav>
            </div>
          </section>
        </div>
      </div>
    </header>
  );
}
