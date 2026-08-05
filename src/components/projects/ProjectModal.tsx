"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { getProject } from "@/data/projects";
import { prefersReducedMotion } from "@/lib/device";
import { getLenisInstance } from "@/components/animation/lenisInstance";
import { consumeProjectOrigin, type OriginRect } from "@/lib/projectTransition";
import { currentRoute, navigate, onRouteChange } from "@/lib/appRoute";
import { ProjectDetail } from "./ProjectDetail";

/** Resolve `/projects/<slug>` → a valid project slug, or null. */
function slugFromUrl(): string | null {
  const { slug } = currentRoute();
  if (!slug) return null;
  return getProject(slug) ? slug : null;
}

type Phase = "enter" | "open" | "leave";

// Kept in sync with the longest CSS transition below (the border expand/retract).
const OPEN_MS = 480;
const CLOSE_MS = 320;

// The panel's cream, held short of opaque so the shader background bleeds
// through it. The page's own content is faded out underneath (see the
// `data-project-modal` effect below), so this is the shader and nothing else.
const PANEL = "rgba(244, 241, 234, 0.85)";
// Softens the shader behind the panel so long-form copy stays readable while
// the background still reads through. Ramps up with the panel rather than
// switching on, so it needs a length at both ends — `none` can't be
// interpolated, `blur(0px)` can.
const PANEL_BLUR = (open: boolean) => `blur(${open ? 10 : 0}px)`;

/**
 * URL-routed project lightbox. `/projects/<slug>` opens a full-viewport cream
 * panel; the intro reads as the page's 10px cream frame thickening inward to
 * fill the screen, then the detail content rises into place. Driven by CSS
 * transitions (not a rAF ticker) so it plays reliably regardless of tab state.
 */
export function ProjectModal() {
  // The hash's current target (source of truth).
  const [target, setTarget] = useState<string | null>(null);
  // Mounted slug — lags `target` so the leave transition can play.
  const [slug, setSlug] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("enter");
  // When opened from an "All projects" row, the row's rect the cover grows from
  // (and collapses back into on close). Null for deep links / featured cards.
  const [origin, setOrigin] = useState<OriginRect | null>(null);

  const sync = useCallback(() => setTarget(slugFromUrl()), []);

  useEffect(() => {
    sync();
    return onRouteChange(sync);
  }, [sync]);

  const close = useCallback(() => {
    // Return to the projects section without stacking a history entry.
    navigate("/projects", { replace: true });
    sync();
  }, [sync]);

  // Drive mount / unmount from the URL target.
  useEffect(() => {
    if (target && target !== slug) {
      setSlug(target);
      setPhase("enter");
      setOrigin(consumeProjectOrigin());
    } else if (!target && slug) {
      setPhase("leave");
      const reduce = prefersReducedMotion();
      const t = setTimeout(() => setSlug(null), reduce ? 0 : CLOSE_MS);
      return () => clearTimeout(t);
    }
  }, [target, slug]);

  // Flip from the collapsed "enter" state to "open" so CSS transitions run from
  // the committed initial state. A timeout (rather than rAF) keeps this firing
  // even when the tab is backgrounded and rAF is paused.
  useEffect(() => {
    if (phase !== "enter" || !slug) return;
    if (prefersReducedMotion()) {
      setPhase("open");
      return;
    }
    const t = setTimeout(() => setPhase("open"), 30);
    return () => clearTimeout(t);
  }, [phase, slug]);

  // Escape closes; lock page scroll while mounted.
  useEffect(() => {
    if (!slug) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);

    const lenis = getLenisInstance();
    lenis?.stop();
    // Lock <html>, not <body>. globals.css gives <html> `overflow-y: scroll` so
    // it owns the viewport scrollbar; hiding <body>'s overflow leaves that track
    // painted but dead, right beside the panel's own scroll surface — two
    // scrollbars. `scrollbar-gutter: stable` still reserves the gutter while the
    // overflow is hidden, so this keeps the no-sideways-jump the gutter is there
    // for.
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      root.style.overflow = prevOverflow;
      lenis?.start();
    };
  }, [slug, close]);

  // Pin the point the page scales toward, measured once per open. The page
  // column spans the whole document, so its own center is far off screen; this
  // puts the origin at the middle of the current viewport, making the page look
  // like it recedes straight back behind the panel. Measured on mount only —
  // by the time the phase flips to `open` the column is already mid-transform,
  // and re-measuring would move the origin out from under the animation.
  //
  // Left in place afterwards rather than cleaned up: transform-origin is inert
  // once the column is back to `transform: none`, and clearing it while the
  // page is still scaling back would snap it sideways.
  useEffect(() => {
    if (!slug) return;
    const page = document.querySelector<HTMLElement>('[data-modal-hide="page"]');
    if (!page) return;
    const y = -page.getBoundingClientRect().top + window.innerHeight / 2;
    document.body.style.setProperty("--modal-origin-y", `${Math.round(y)}px`);
  }, [slug]);

  // Scale and fade the page's own content (hero, sections, header bar, footer)
  // out while the panel is up. The panel is translucent so the shader reads
  // through it; without this the page sections would read through it too.
  // Released the moment the leave transition starts, so the page is back by the
  // time the panel has finished collapsing. See globals.css for the rules this
  // drives — including the matching durations that keep the page's retreat and
  // the panel's growth on the same clock.
  //
  // Keyed on the `open` phase rather than merely being mounted, so the page
  // starts receding on the same frame the panel starts growing — the `enter`
  // phase is the panel's committed collapsed state, before anything moves.
  useEffect(() => {
    if (phase === "open") {
      document.body.dataset.projectModal = "open";
    } else {
      delete document.body.dataset.projectModal;
    }
    return () => {
      delete document.body.dataset.projectModal;
    };
  }, [phase]);

  const project = slug ? getProject(slug) : null;
  if (!slug || !project) return null;

  const reduce = prefersReducedMotion();
  const isOpen = phase === "open";
  // Grows out slower than it collapses back, matching the open/close feel.
  const coverEase = "cubic-bezier(0.7, 0, 0.2, 1)";
  const coverMs = phase === "leave" ? CLOSE_MS : OPEN_MS;

  return (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true">
      {origin && !reduce ? (
        // Opened from a project row: a cream box grows out of that row to fill
        // the viewport (and collapses back into it on close).
        <div
          aria-hidden
          className="pointer-events-none fixed"
          style={{
            background: PANEL,
            // Fades transparent → cream across the grow (and back out on close),
            // so the row doesn't snap to a solid block the instant it's clicked.
            opacity: isOpen ? 1 : 0,
            top: isOpen ? 0 : origin.top,
            left: isOpen ? 0 : origin.left,
            width: isOpen ? "100vw" : origin.width,
            height: isOpen ? "100vh" : origin.height,
            borderRadius: isOpen ? 0 : 6,
            backdropFilter: PANEL_BLUR(isOpen),
            WebkitBackdropFilter: PANEL_BLUR(isOpen),
            transition: `opacity ${coverMs}ms ${coverEase}, top ${coverMs}ms ${coverEase}, left ${coverMs}ms ${coverEase}, width ${coverMs}ms ${coverEase}, height ${coverMs}ms ${coverEase}, border-radius ${coverMs}ms ${coverEase}, backdrop-filter ${coverMs}ms ${coverEase}, -webkit-backdrop-filter ${coverMs}ms ${coverEase}`,
          }}
        />
      ) : (
        // Cream frame that thickens inward to fill the viewport (sits behind the
        // scroll surface, which is transparent, so the detail reads on top of
        // this single tinted layer — two stacked translucent creams would
        // compound into an opaque one).
        //
        // An inset ring rather than a border: the four sides of a border meet at
        // mitered corners, and now that the cream is translucent those joins
        // antialias into faint diagonals across the panel. An inset box-shadow
        // paints the whole ring as one region, so the tint stays even.
        //
        // The blur can't grow inward with the ring — backdrop-filter applies to
        // the element's whole backdrop, not to where the shadow paints — so it
        // ramps up evenly across the viewport over the same duration instead.
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0"
          style={{
            boxShadow: `inset 0 0 0 ${isOpen ? "100vmax" : "10px"} ${PANEL}`,
            backdropFilter: PANEL_BLUR(isOpen),
            WebkitBackdropFilter: PANEL_BLUR(isOpen),
            transition: reduce
              ? "none"
              : `box-shadow ${OPEN_MS}ms ${coverEase}, backdrop-filter ${OPEN_MS}ms ${coverEase}, -webkit-backdrop-filter ${OPEN_MS}ms ${coverEase}`,
          }}
        />
      )}

      <div
        data-lenis-prevent
        // `bleed-root`: the width a `full-bleed` figure measures against. This
        // box excludes both scrollbars, so a bled image lands flush instead of
        // overflowing sideways the way 100vw would.
        className="absolute inset-0 overflow-y-auto bleed-root"
        style={{
          opacity: isOpen ? 1 : 0,
          transition: reduce
            ? "none"
            : isOpen
              ? "opacity 120ms linear 380ms"
              : "opacity 140ms linear",
        }}
      >
        <div
          style={{
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? "none" : "translateY(24px)",
            transition: reduce
              ? "none"
              : isOpen
                ? "opacity 260ms ease-out 220ms, transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1) 220ms"
                : "opacity 140ms ease-in, transform 140ms ease-in",
          }}
        >
          <ProjectDetail project={project} />
        </div>
      </div>

      <button
        type="button"
        onClick={close}
        aria-label="Close project"
        style={{
          opacity: isOpen ? 1 : 0,
          transition: reduce ? "none" : "opacity 200ms 380ms",
          // Clear the notch safe area (viewport-fit=cover); 0 on desktop.
          top: "calc(1.25rem + env(safe-area-inset-top, 0px))",
        }}
        className="fixed right-5 z-[130] flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-black/70 transition-colors hover:bg-black/10 hover:text-black"
      >
        <X size={18} strokeWidth={1.75} />
      </button>
    </div>
  );
}
