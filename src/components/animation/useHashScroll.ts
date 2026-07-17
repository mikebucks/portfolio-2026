"use client";

import { useEffect } from "react";
import { smoothScrollTo } from "./lenisInstance";

/** Section ids that live on the homepage and are safe to scroll to. */
const SECTION_IDS = new Set(["projects", "about", "contact"]);

/**
 * Scrolls to a homepage section when the URL hash names one (on mount and on
 * every `hashchange`). Deeper hashes like `#projects/chisel` are intentionally
 * ignored here — those drive the project modal (see ProjectModal), not a scroll.
 */
export function useHashScroll() {
  useEffect(() => {
    const scrollToHash = () => {
      const raw = window.location.hash.replace(/^#/, "");
      if (!raw || !SECTION_IDS.has(raw)) return;
      const el = document.getElementById(raw);
      if (el) smoothScrollTo(el);
    };

    // Defer the initial run so the sections are laid out (and Lenis is ready)
    // before we measure and scroll.
    const raf = requestAnimationFrame(scrollToHash);
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, []);
}
