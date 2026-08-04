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

// The hero rides the same scroll-spy as the sections so the wordmark can be
// "active" in the top of the page. It has no id (it isn't a routable section),
// so it gets a key that can't collide with one.
const HERO_KEY = "__hero";

// Document order — the spy resolves ties by taking the first match, so the
// highest thing on the page wins.
const SPY_ORDER = [HERO_KEY, ...NAV_LINKS.map((link) => link.id)];

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
    // border-box, not the default content-box: the scroll state only swaps the
    // bar's padding, so a content-box observation never fires and --header-h
    // stays frozen at the expanded height (leaving a gap under the collapsed
    // bar). Observing the border box also ticks through the padding transition,
    // so overlays track the animation frame by frame.
    const observer = new ResizeObserver(publish);
    observer.observe(el, { box: "border-box" });
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

    const sections = [
      document.querySelector<HTMLElement>("[data-hero]"),
      ...NAV_LINKS.map((link) => document.getElementById(link.id)),
    ].filter((el): el is HTMLElement => el !== null);
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
          const key = entry.target.id || HERO_KEY;
          if (entry.isIntersecting) intersecting.add(key);
          else intersecting.delete(key);
        }
        // Preserve document order so the highest visible section wins.
        setActiveId(SPY_ORDER.find((key) => intersecting.has(key)) ?? null);
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
      scrolled ? "py-2 bg-cream" : "pt-8 pb-6 bg-white/80")}>
      {/* Contents fade out behind the translucent project modal; the bar's own
          background is cleared by the same rules. Kept off the <header>
          element so GSAP's intro autoAlpha tween owns its opacity alone.
          See globals.css. */}
      <div data-modal-hide>
        {/* Both portal themselves to <body> and pin to the bottom-right rail —
            they render from here only because this is where the panel's state
            already lived. The header's backdrop-filter would otherwise be
            their containing block, so neither can be positioned in place. */}
        <SynthPanel />
        <SynthToggleButton />
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
              // -ml-2.5 cancels nav-link's own inline padding on the left, so
              // the wordmark stays flush to the page gutter while the hover
              // fill still gets a box to sweep through.
              aria-current={activeId === HERO_KEY ? "true" : undefined}
              className={cn(
                "nav-link -ml-2.5 font-mono text-sm tracking-tight text-black",
                activeId === HERO_KEY && "is-active",
              )}
            >
              Mike<span className="font-bold">Bucks</span>
            </a>
            <div className="flex justify-between gap-6 items-center">
              <nav aria-label="Primary">
                {/* gap-2, not gap-6: the links carry their own inline padding
                    now (it's the hover fill's box), so the visual spacing
                    between labels stays where it was. */}
                <ul className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-black/80">
                  {NAV_LINKS.map((link) => (
                    <li key={link.id}>
                      <a
                        href={`/${link.id}`}
                        onClick={handleSectionClick(link.id)}
                        aria-current={activeId === link.id ? "true" : undefined}
                        className={cn(
                          "nav-link",
                          activeId === link.id && "is-active",
                        )}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </section>
        </div>
      </div>
    </header>
  );
}
