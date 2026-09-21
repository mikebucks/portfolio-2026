"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { smoothScrollTo } from "@/components/animation/lenisInstance";
import { isHomeUrl, navigate, parseRoute } from "@/lib/appRoute";
import { SynthToggleButton } from "../audio/SynthToggleButton";
import { useSynthDeepLink } from "../audio/useSynthDeepLink";

const NAV_LINKS = [
  { id: "projects", label: "Projects" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

// Active-nav key for `/` (the hero); can't collide with a section id.
const HERO_KEY = "__hero";

// px; must match the `py-3` below.
const COLLAPSED_PAD_Y = 12;

// Module scope: defining inside the component remounts the panel every render.
const SynthPanel = dynamic(
  () => import("../audio/SynthPanel").then((m) => m.SynthPanel),
  { ssr: false },
);

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const onHome = isHomeUrl(pathname);
  useSynthDeepLink();

  // Active item comes from the URL (useRouteScroll keeps it in sync with scroll).
  const activeId = onHome
    ? (parseRoute(pathname)?.section ?? HERO_KEY)
    : null;

  // Publish --header-h (live height, for overlays) and --section-scroll-offset
  // (collapsed bottom edge, where smoothScrollTo lands sections).
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publish = () => {
      const root = document.documentElement;
      root.style.setProperty("--header-h", `${el.offsetHeight}px`);
      // Not getBoundingClientRect: the intro's GSAP transform would leak in.
      const styles = getComputedStyle(el);
      const padY =
        Number.parseFloat(styles.paddingTop) +
        Number.parseFloat(styles.paddingBottom);
      const inset = Number.parseFloat(styles.top) || 0;
      root.style.setProperty(
        "--section-scroll-offset",
        `${el.offsetHeight - padY + COLLAPSED_PAD_Y * 2 + inset}px`,
      );
    };
    publish();
    // border-box: only the padding changes, so content-box never fires.
    const observer = new ResizeObserver(publish);
    observer.observe(el, { box: "border-box" });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // setState only on flip: Lenis fires scroll every frame.
    let prev: boolean | null = null;
    const onScroll = () => {
      const next = window.scrollY > 10;
      if (next === prev) return;
      prev = next;
      setScrolled(next);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Smooth-scroll in-page and push the path; modified clicks fall through.
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
    <header
      ref={headerRef}
      data-intro-header
      style={{ top: "env(safe-area-inset-top, 0px)" }}
      // Never transition `transform`: it would fight the GSAP intro.
      className={cn("fixed w-full gutter-x bg-cream backdrop-blur-sm transition-[background-color,padding] duration-400",
      // Scrolled: above the cream frame (z-100) and hovered cards (z-101).
      scrolled ? "z-[110] py-3" : "z-30 py-5")}>
      {/* Off the <header> itself so the GSAP intro alone owns its opacity. */}
      <div data-modal-hide>
        {/* Both portal to <body>; they live here for the panel state only. */}
        <SynthPanel />
        <SynthToggleButton />
        <div className={
          "flex items-center justify-between inset-x-0 mx-auto w-full max-w-[1600px]"
        }>
          <section className="flex justify-between w-full">
            {/* Plain anchors, not next/link: Link would prefetch the homepage per item. */}
            <a
              href="/"
              onClick={handleLogoClick}
              // -ml-2.5 cancels nav-link's inline padding so the wordmark sits on the gutter.
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
                {/* gap-2: nav-link's own inline padding supplies the rest. */}
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
