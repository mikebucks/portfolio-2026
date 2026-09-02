"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { getProject } from "@/data/projects";
import { prefersReducedMotion } from "@/lib/device";
import { getLenisInstance } from "@/components/animation/lenisInstance";
import { currentRoute, navigate, onRouteChange } from "@/lib/appRoute";
import { ProjectDetail } from "./ProjectDetail";

/** Resolve `/projects/<slug>` → a valid project slug, or null. */
function slugFromUrl(): string | null {
  const { slug } = currentRoute();
  if (!slug) return null;
  return getProject(slug) ? slug : null;
}

type Phase = "enter" | "open" | "leave";

// The cover's rise from the bottom — same length and curve as the intro
// sequence's cream wipe (0.55s expo.out), so opening a case study reads as the
// same gesture as the site revealing itself on load.
const OPEN_MS = 550;
const CLOSE_MS = 320;
// expo.out / expo.in as CSS curves, matching the GSAP eases the intro uses.
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN = "cubic-bezier(0.7, 0, 0.84, 0)";

// How long after the cover starts rising the first content blocks begin their
// cascade — mirrors the intro overlapping the headline into the tail of the
// wipe rather than waiting for it to finish.
const CASCADE_DELAY_S = 0.3;

// The panel's cream, held short of opaque so the shader background bleeds
// through it. The page's own content is faded out underneath (see the
// `data-project-modal` effect below), so this is the shader and nothing else.
const PANEL = "rgba(244, 241, 234, 0.95)";

/**
 * URL-routed project lightbox. `/projects/<slug>` opens a full-viewport cream
 * panel that rises from the bottom of the screen; the content blocks then
 * cascade in top-to-bottom (offset + fade), and blocks below the fold play the
 * same reveal as they scroll into view. Timing matches the initial hero intro.
 */
export function ProjectModal() {
  // The hash's current target (source of truth).
  const [target, setTarget] = useState<string | null>(null);
  // Mounted slug — lags `target` so the leave transition can play.
  const [slug, setSlug] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("enter");
  // The detail's scroll surface — the cascade queries its [data-reveal] blocks.
  const scrollRef = useRef<HTMLDivElement>(null);

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
  // time the panel has finished sliding away. See globals.css for the rules
  // this drives — including the matching durations that keep the page's
  // retreat and the panel's rise on the same clock.
  //
  // Keyed on the `open` phase rather than merely being mounted, so the page
  // starts receding on the same frame the panel starts rising — the `enter`
  // phase is the panel's committed off-screen state, before anything moves.
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

  // Park every content block in its pre-reveal state (offset down, invisible)
  // the moment the detail mounts. The scroll surface itself is still at
  // opacity 0 during `enter`, so this can never flash — it just guarantees the
  // cascade starts from a committed hidden state.
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

  // The cascade. Once the cover is rising, blocks inside the initial viewport
  // fly up into place top-to-bottom on the intro headline's timing (0.9s
  // expo.out, 0.18s stagger, 24px offset). Everything below the fold waits on
  // an IntersectionObserver and plays the same single-block reveal as it
  // scrolls in — one motion vocabulary for the whole page.
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
        // The panel is the scroll container; trigger slightly inside the
        // bottom edge so a block is moving as it enters, not after. The huge
        // top margin keeps anything scrolled PAST still "intersecting" — a
        // fast jump can put a block above the viewport between observations,
        // and without this it would never fire and stay invisible.
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
      {/* Cream cover: rises from the bottom of the screen to fill the viewport
          (and slides back down on close) — the intro's cream wipe, played in
          reverse direction. Translucent, with a constant backdrop blur, so the
          shader reads through it softened wherever it has covered. */}
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
        // `bleed-root`: the width a `full-bleed` figure measures against. This
        // box excludes both scrollbars, so a bled image lands flush instead of
        // overflowing sideways the way 100vw would.
        //
        // The surface itself only gates visibility: it snaps on for the open
        // (the blocks are individually hidden, the cascade is theirs to play)
        // and fades as one on leave, ahead of the cover sliding away.
        className="absolute inset-0 overflow-y-auto bleed-root"
        style={{
          opacity: isOpen ? 1 : 0,
          transition:
            reduce || isOpen ? "none" : "opacity 140ms linear",
        }}
      >
        {/* The wordmark at the top of the article is the way out — there's no
            floating close button. It scrolls away with the content, so Escape
            (bound above) stays the always-available exit. */}
        <ProjectDetail project={project} onBack={close} />
      </div>
    </div>
  );
}
