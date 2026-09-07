"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { getProject } from "@/data/projects";
import { prefersReducedMotion } from "@/lib/device";
import { getLenisInstance } from "@/components/animation/lenisInstance";
import { currentRoute, navigate, onRouteChange } from "@/lib/appRoute";
import { ProjectDetail } from "./ProjectDetail";

/** Slug from `/projects/<slug>`, or null if unknown. */
function slugFromUrl(): string | null {
  const { slug } = currentRoute();
  if (!slug) return null;
  return getProject(slug) ? slug : null;
}

type Phase = "enter" | "open" | "leave";

// Cover rise matches the intro's cream wipe (0.55s expo.out).
const OPEN_MS = 550;
const CLOSE_MS = 320;
// expo.out / expo.in as CSS curves.
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN = "cubic-bezier(0.7, 0, 0.84, 0)";

// Cascade starts before the cover finishes rising, like the intro.
const CASCADE_DELAY_S = 0.3;

// Held short of opaque so the shader bleeds through.
const PANEL = "rgba(244, 241, 234, 0.95)";

/**
 * URL-routed project lightbox. `/projects/<slug>` rises a cream panel from the
 * bottom, then content blocks cascade in; timing matches the hero intro.
 */
export function ProjectModal() {
  // URL target (source of truth); `slug` lags it so the leave transition can play.
  const [target, setTarget] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("enter");
  const scrollRef = useRef<HTMLDivElement>(null);

  const sync = useCallback(() => setTarget(slugFromUrl()), []);

  useEffect(() => {
    sync();
    return onRouteChange(sync);
  }, [sync]);

  const close = useCallback(() => {
    // No history entry.
    navigate("/projects", { replace: true });
    sync();
  }, [sync]);

  // Drive mount / unmount from the URL target.
  useEffect(() => {
    if (target && target !== slug) {
      setSlug(target);
      setPhase("enter");
    } else if (!target && slug) {
      setPhase("leave");
      const reduce = prefersReducedMotion();
      const t = setTimeout(() => setSlug(null), reduce ? 0 : CLOSE_MS);
      return () => clearTimeout(t);
    }
  }, [target, slug]);

  // Flip enter → open after commit so CSS transitions run from the initial state.
  // Timeout, not rAF: rAF pauses in background tabs.
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
    // Lock <html>, not <body>: <html> owns the scrollbar (globals.css), and
    // locking <body> leaves a dead second scrollbar beside the panel's.
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      root.style.overflow = prevOverflow;
      lenis?.start();
    };
  }, [slug, close]);

  // Scale origin at viewport centre, measured once: re-measuring mid-transform shifts it.
  // Never cleared — clearing while the page scales back snaps it sideways.
  useEffect(() => {
    if (!slug) return;
    const page = document.querySelector<HTMLElement>('[data-modal-hide="page"]');
    if (!page) return;
    const y = -page.getBoundingClientRect().top + window.innerHeight / 2;
    document.body.style.setProperty("--modal-origin-y", `${Math.round(y)}px`);
  }, [slug]);

  // Fade the page out behind the translucent panel (rules in globals.css).
  // Keyed on `open` so page and panel start moving on the same frame.
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

  // Park blocks hidden on mount; the surface is opacity 0 during `enter`, so no flash.
  useEffect(() => {
    if (!slug || prefersReducedMotion()) return;
    const root = scrollRef.current;
    if (!root) return;
    gsap.set(root.querySelectorAll("[data-reveal]"), {
      opacity: 0,
      y: 24,
      force3D: true,
    });
  }, [slug]);

  // Cascade: in-viewport blocks stagger up on the intro headline's timing;
  // below-fold blocks play the same reveal as they scroll in.
  useEffect(() => {
    if (phase !== "open" || prefersReducedMotion()) return;
    const root = scrollRef.current;
    if (!root) return;

    const blocks = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const fold = window.innerHeight;
    const initial = blocks.filter(
      (el) => el.getBoundingClientRect().top < fold,
    );
    const below = blocks.filter((el) => !initial.includes(el));

    const reveal = (targets: gsap.TweenTarget, delay = 0, stagger = 0) =>
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "expo.out",
        delay,
        stagger,
        force3D: true,
        overwrite: true,
      });

    reveal(initial, CASCADE_DELAY_S, 0.18);

    let io: IntersectionObserver | null = null;
    if (below.length) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            reveal(entry.target);
            io?.unobserve(entry.target);
          }
        },
        // Trigger just inside the bottom edge. Huge top margin keeps blocks
        // scrolled past still intersecting, else a fast jump leaves them invisible.
        { root, rootMargin: "100000px 0px -10% 0px" },
      );
      below.forEach((el) => io?.observe(el));
    }

    return () => io?.disconnect();
  }, [phase]);

  const project = slug ? getProject(slug) : null;
  if (!slug || !project) return null;

  const reduce = prefersReducedMotion();
  const isOpen = phase === "open";

  return (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true">
      {/* Cream cover rising from the bottom — the intro wipe in reverse. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background: PANEL,
          transform: isOpen ? "none" : "translateY(100%)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          willChange: "transform",
          transition: reduce
            ? "none"
            : phase === "leave"
              ? `transform ${CLOSE_MS}ms ${EASE_IN}`
              : `transform ${OPEN_MS}ms ${EASE_OUT}`,
        }}
      />

      <div
        ref={scrollRef}
        data-lenis-prevent
        // Snaps visible on open (blocks hide themselves); fades as one on leave.
        className="absolute inset-0 overflow-y-auto"
        style={{
          opacity: isOpen ? 1 : 0,
          transition:
            reduce || isOpen ? "none" : "opacity 140ms linear",
        }}
      >
        {/* The wordmark is the exit; no close button. Escape stays always available. */}
        <ProjectDetail project={project} onBack={close} />
      </div>
    </div>
  );
}
