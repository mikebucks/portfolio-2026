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
      className={`flex items-center justify-center text-black hover:text-accent transition ${open
          ? "cursor-zoom-out"
          : "cursor-zoom-in"
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
        {/* Synth Icon */}
        {/* <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="M6 8h4" />
        <path d="M14 8h.01" />
        <path d="M18 8h.01" />
        <path d="M2 12h20" />
        <path d="M6 12v4" />
        <path d="M10 12v4" />
        <path d="M14 12v4" />
        <path d="M18 12v4" /> */}

        {/* Faders Icon */}
        {/* <path d="M14 17H5"/>
        <path d="M19 7h-9"/>
        <circle cx="17" cy="17" r="3"/>
        <circle cx="7" cy="7" r="3"/> */}

        {/* Philosopher's Seal Icon */}
        <g fill="none" strokeWidth="1" strokeLinejoin="miter">
          <circle cx="10" cy="10" r="9.3"/>
          <polygon points="10,0.7 18.05,14.65 1.95,14.65"/>
          <rect x="6.25" y="7.15" width="7.5" height="7.5"/>
          <circle cx="10" cy="10.9" r="3.75"/>
        </g>
      </svg>
    </button>
  );
}
