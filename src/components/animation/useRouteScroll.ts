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

    const syncUrl = () => {
      ticking = false;

      // Never clobber an open project modal.
      if (currentRoute().slug) return;

      const line = window.innerHeight * ACTIVE_LINE;
      let activeId: SectionId | null = null;
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) activeId = id;
      }

      navigate(sectionPath(activeId), { replace: true });
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(syncUrl);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}
