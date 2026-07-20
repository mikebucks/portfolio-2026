"use client";

import { useEffect } from "react";
import { smoothScrollTo } from "./lenisInstance";

/** Section ids that live on the homepage and are safe to scroll to. */
const SECTION_IDS = ["projects", "about", "contact"] as const;
const SECTION_ID_SET = new Set<string>(SECTION_IDS);

/** Fraction of the viewport (from the top) a section must cross to be "active". */
const ACTIVE_LINE = 0.35;

/**
 * Two-way sync between the URL hash and homepage scroll position.
 *
 * - hash → scroll: when the URL hash names a section (on mount and on every
 *   `hashchange`), smooth-scroll to it. Deeper hashes like `#projects/chisel`
 *   are ignored here — those drive the project modal (see ProjectModal).
 * - scroll → hash: as sections cross the top of the viewport, mirror the active
 *   section into the hash via `replaceState` (no history spam, no `hashchange`
 *   feedback loop). Scrolling back to the hero clears the hash entirely, so
 *   returning to the top from `#projects` drops the fragment from the URL.
 */
export function useHashScroll() {
  // hash → scroll
  useEffect(() => {
    const scrollToHash = () => {
      const raw = window.location.hash.replace(/^#/, "");
      if (!raw || !SECTION_ID_SET.has(raw)) return;
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

  // scroll → hash
  useEffect(() => {
    let ticking = false;

    const syncHash = () => {
      ticking = false;

      // Never clobber a deeper hash (e.g. an open `#projects/<slug>` modal).
      const current = window.location.hash.replace(/^#/, "");
      if (current.includes("/")) return;

      const line = window.innerHeight * ACTIVE_LINE;
      let activeId: string | null = null;
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) activeId = id;
      }

      if (activeId) {
        if (current !== activeId) {
          history.replaceState(null, "", `#${activeId}`);
        }
      } else if (current) {
        // Back at the hero — strip the fragment so the URL returns to "/".
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(syncHash);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}
