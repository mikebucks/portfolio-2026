"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { getProject } from "@/data/projects";
import { prefersReducedMotion } from "@/lib/device";
import { getLenisInstance } from "@/components/animation/lenisInstance";
import { consumeProjectOrigin, type OriginRect } from "@/lib/projectTransition";
import { ProjectDetail } from "./ProjectDetail";

/** Parse `#projects/<slug>` → a valid project slug, or null. */
function slugFromHash(): string | null {
  const m = window.location.hash.match(/^#projects\/(.+)$/);
  if (!m) return null;
  const slug = decodeURIComponent(m[1]);
  return getProject(slug) ? slug : null;
}

type Phase = "enter" | "open" | "leave";

// Kept in sync with the longest CSS transition below (the border expand/retract).
const OPEN_MS = 480;
const CLOSE_MS = 320;

/**
 * Hash-routed project lightbox. `#projects/<slug>` opens a full-viewport cream
 * modal; the intro reads as the page's 10px cream frame thickening inward to
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

  const sync = useCallback(() => setTarget(slugFromHash()), []);

  useEffect(() => {
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [sync]);

  const close = useCallback(() => {
    // Return to the projects section without stacking a history entry.
    history.replaceState(null, "", "#projects");
    sync();
  }, [sync]);

  // Drive mount / unmount from the hash target.
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
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      lenis?.start();
    };
  }, [slug, close]);

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
            background: "#f4f1ea",
            // Fades transparent → cream across the grow (and back out on close),
            // so the row doesn't snap to a solid block the instant it's clicked.
            opacity: isOpen ? 1 : 0,
            top: isOpen ? 0 : origin.top,
            left: isOpen ? 0 : origin.left,
            width: isOpen ? "100vw" : origin.width,
            height: isOpen ? "100vh" : origin.height,
            borderRadius: isOpen ? 0 : 6,
            transition: `opacity ${coverMs}ms ${coverEase}, top ${coverMs}ms ${coverEase}, left ${coverMs}ms ${coverEase}, width ${coverMs}ms ${coverEase}, height ${coverMs}ms ${coverEase}, border-radius ${coverMs}ms ${coverEase}`,
          }}
        />
      ) : (
        // Cream frame that thickens inward to fill the viewport (sits behind the
        // scroll surface, so once both are cream the content reads on top).
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 box-border"
          style={{
            borderStyle: "solid",
            borderColor: "#f4f1ea",
            borderWidth: isOpen ? "100vmax" : 10,
            transition: reduce
              ? "none"
              : `border-width ${OPEN_MS}ms ${coverEase}`,
          }}
        />
      )}

      <div
        data-lenis-prevent
        className="absolute inset-0 overflow-y-auto bg-cream"
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
