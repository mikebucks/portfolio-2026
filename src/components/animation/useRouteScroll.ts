"use client";

import { useEffect } from "react";
import { smoothScrollTo } from "./lenisInstance";
import {
  SECTION_IDS,
  currentRoute,
  navigate,
  onRouteChange,
  sectionPath,
  type SectionId,
} from "@/lib/appRoute";

/** Fraction of the viewport (from the top) a section must cross to be "active". */
const ACTIVE_LINE = 0.35;

/**
 * Two-way sync between the URL path and homepage scroll position.
 *
 * - URL → scroll: when the path names a section (on mount, and on every
 *   back/forward or in-page navigation), smooth-scroll to it. `/projects/<slug>`
 *   is left alone — that drives the project modal, which locks page scroll.
 * - scroll → URL: as sections cross the top of the viewport, mirror the active
 *   one into the path with `replaceState`, so scrolling never stacks history
 *   entries. Scrolling back to the hero restores `/`.
 */
export function useRouteScroll() {
  // URL → scroll
  useEffect(() => {
    const scrollToSection = () => {
      const { section, slug } = currentRoute();
      if (!section || slug) return;
      const el = document.getElementById(section);
      if (el) smoothScrollTo(el);
    };

    // Defer the initial run so the sections are laid out (and Lenis is ready)
    // before we measure and scroll.
    const raf = requestAnimationFrame(scrollToSection);
    const unsubscribe = onRouteChange(scrollToSection);
    return () => {
      cancelAnimationFrame(raf);
      unsubscribe();
    };
  }, []);

  // scroll → URL
  useEffect(() => {
    let ticking = false;

    // Document-space section tops, measured on layout changes rather than per
    // scroll frame — getBoundingClientRect inside the scroll handler forces a
    // layout flush on every frame of a Lenis smooth scroll.
    let tops: { id: SectionId; top: number }[] = [];

    const measureTops = () => {
      // Never measure while the project modal is open: the page wrapper is
      // scale-transformed (globals.css [data-modal-hide]), which skews rects.
      if (currentRoute().slug) return;
      const next: { id: SectionId; top: number }[] = [];
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el) {
          next.push({
            id,
            top: el.getBoundingClientRect().top + window.scrollY,
          });
        }
      }
      tops = next;
    };

    const syncUrl = () => {
      ticking = false;

      // Never clobber an open project modal.
      if (currentRoute().slug) return;

      const line = window.scrollY + window.innerHeight * ACTIVE_LINE;
      let activeId: SectionId | null = null;
      for (const s of tops) {
        if (s.top <= line) activeId = s.id;
      }

      // Silent: this only reflects the scroll into the URL. Emitting the route
      // event would wake the URL → scroll effect above and scroll to `activeId`,
      // which fights (and traps) the very scroll that triggered this sync.
      navigate(sectionPath(activeId), { replace: true, notify: false });
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(syncUrl);
    };

    // Measure after first layout, then again whenever the document reflows
    // (images loading, content changes) or the window resizes. The body
    // observer sees border-box size only, so the modal's transform never
    // triggers a (skewed) re-measure on its own.
    const raf = requestAnimationFrame(measureTops);
    const reflowObserver = new ResizeObserver(measureTops);
    reflowObserver.observe(document.body);
    window.addEventListener("resize", measureTops, { passive: true });
    // Re-measure once the modal route closes — measurements were suspended
    // while it was open.
    const unsubscribeRoute = onRouteChange(() => {
      requestAnimationFrame(measureTops);
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      reflowObserver.disconnect();
      window.removeEventListener("resize", measureTops);
      unsubscribeRoute();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
}
