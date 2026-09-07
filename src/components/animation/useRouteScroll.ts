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

/** Viewport fraction a section must cross to be active. */
const ACTIVE_LINE = 0.35;

/** Two-way sync of URL path and homepage scroll. `/projects/<slug>` is left to the modal. */
export function useRouteScroll() {
  // URL → scroll
  useEffect(() => {
    const scrollToSection = () => {
      const { section, slug } = currentRoute();
      if (!section || slug) return;
      const el = document.getElementById(section);
      if (el) smoothScrollTo(el);
    };

    // Deferred until layout and Lenis are ready.
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

    // Measured on layout changes, not per scroll frame (rect reads force layout).
    let tops: { id: SectionId; top: number }[] = [];

    const measureTops = () => {
      // Modal open: the page is scale-transformed, rects are skewed.
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

      if (currentRoute().slug) return;

      const line = window.scrollY + window.innerHeight * ACTIVE_LINE;
      let activeId: SectionId | null = null;
      for (const s of tops) {
        if (s.top <= line) activeId = s.id;
      }

      // notify: false, or the URL → scroll effect would fight this scroll.
      navigate(sectionPath(activeId), { replace: true, notify: false });
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(syncUrl);
    };

    const raf = requestAnimationFrame(measureTops);
    const reflowObserver = new ResizeObserver(measureTops);
    reflowObserver.observe(document.body);
    window.addEventListener("resize", measureTops, { passive: true });
    // Re-measure after the modal closes.
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
