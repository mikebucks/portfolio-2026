"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { smoothScrollTo } from "@/components/animation/lenisInstance";
import { isHomeUrl, navigate, parseRoute } from "@/lib/appRoute";
import { SynthToggleButton } from "../audio/SynthToggleButton";

const NAV_LINKS = [
  { id: "projects", label: "Projects" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

// The wordmark lights up while the page sits on the hero — i.e. at `/`, which
// carries no section. It isn't a routable section itself, so it gets a key that
// can't collide with one.
const HERO_KEY = "__hero";

// The scrolled bar's vertical padding, in px. Mirrors the `py-3` in the
// className below — Tailwind needs the literal, and the height published as
// --header-h-collapsed needs the number.
const COLLAPSED_PAD_Y = 12;

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
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  // Every homepage URL (`/`, `/projects`, `/about`, `/contact`,
  // `/projects/<slug>`) renders this same tree, so the in-page behaviours below
  // stay live as the path changes underneath them.
  const onHome = isHomeUrl(pathname);

  // The lit nav item *is* the URL. `useRouteScroll` already mirrors the scroll
  // position into the path as each section crosses its active line, so reading
  // the path back is what keeps the highlight and the URL from disagreeing —
  // they used to be two independent spies running on two different lines (a
  // viewport-center IntersectionObserver here, the 35% line there), so the
  // highlight could flip a section before or after the URL did.
  const activeId = onHome
    ? (parseRoute(pathname)?.section ?? HERO_KEY)
    : null;

  // Publish the bar's rendered height as --header-h so fixed overlays (the
  // synth panel) can start below the nav instead of on top of it. It isn't a
  // constant — the scroll state swaps the padding, and it animates — so
  // observe it rather than measuring once.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publish = () => {
      const root = document.documentElement;
      root.style.setProperty("--header-h", `${el.offsetHeight}px`);
      // Also publish where the bar's bottom edge ends up once the page leaves
      // the top — the line smoothScrollTo lands sections on, so a nav click
      // stops the section just below the bar instead of behind it.
      //
      // Measured rather than taken from getBoundingClientRect().bottom: the
      // intro flies the header in with a GSAP transform, and a rect read during
      // that would bake the animation into the offset. So: the content height
      // (offsetHeight minus whatever padding is applied *right now*, which
      // stays constant through the padding transition) plus the collapsed
      // padding, plus the safe-area inset the bar is pushed down by (the
      // computed `top`, resolved from env() by the browser — zero off iOS).
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
    // Only call into React when the threshold actually flips — Lenis fires
    // scroll every frame of a smooth scroll, and even a bailed-out setState
    // still enters the React dispatch each time.
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
      className={cn("fixed w-full gutter-x bg-cream backdrop-blur-sm transition-[background-color,padding] duration-400",
      // The scrolled bar outranks the cream frame bars (z-100), the unscrolled
      // one doesn't. A hovered featured card takes z-101 to get its ring out
      // from under that frame, and a card scrolled up behind the nav would
      // otherwise paint over it. Only the scrolled bar can afford the
      // promotion: it's opaque bg-cream, so covering the frame's 10px rails
      // across its own height is seamless. Unscrolled it's bg-white/80 over the
      // hero — there it stays under the frame so the cream edge reads
      // continuous, which is safe because the featured row can't reach the top
      // of a 100svh hero.
      scrolled ? "z-[110] py-3" : "z-30 py-5")}>
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
          "flex items-center justify-between inset-x-0 mx-auto w-full max-w-[1600px]"
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
