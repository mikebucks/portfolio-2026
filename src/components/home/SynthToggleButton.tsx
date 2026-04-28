"use client";

import { useUIStore } from "@/lib/store";

/**
 * Always-visible toggle in the lower-right corner. Uses the Lucide `music-2`
 * glyph inlined to avoid pulling in the whole icon package.
 */
export function SynthToggleButton() {
  const open = useUIStore((s) => s.synthPanelOpen);
  const toggle = useUIStore((s) => s.toggleSynthPanel);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={open}
      aria-label={open ? "Close synth panel" : "Open synth panel"}
      title={open ? "Close synth" : "Open synth"}
      className={`fixed bottom-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition ${
        open
          ? "border-accent/60 bg-accent/15 text-accent shadow-[0_0_18px_rgba(212,255,58,0.35)]"
          : "border-white/15 bg-black/60 text-white/80 hover:border-white/30 hover:text-white"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="8" cy="18" r="4" />
        <path d="M12 18V2l7 4" />
      </svg>
    </button>
  );
}
