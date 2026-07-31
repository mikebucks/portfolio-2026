"use client";

import { useUIStore } from "@/lib/store";

// The two glyphs share the seal's (10,10) center and cross-fade through a
// quarter turn in opposite directions, so opening reads as the mark rotating
// into a cross rather than two icons cutting. Written as inline style rather
// than utility classes because `transform-box: view-box` has to be explicit —
// without it, older engines resolve the rotation about the SVG's border box
// and the glyph swings off-center.
const glyph = (visible: boolean, hiddenDeg: number) => ({
  transformBox: "view-box" as const,
  transformOrigin: "10px 10px",
  transform: `rotate(${visible ? 0 : hiddenDeg}deg)`,
  opacity: visible ? 1 : 0,
  transition:
    "transform 320ms cubic-bezier(0.7, 0, 0.2, 1), opacity 200ms ease-out",
});

/**
 * The panel's only open/close control: a philosopher's seal that turns into a
 * close cross while the panel is up. Drawn inline rather than pulled from an
 * icon package.
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
        {/* Philosopher's Seal */}
        <g
          style={glyph(!open, 90)}
          fill="none"
          strokeWidth="1"
          strokeLinejoin="miter"
        >
          <circle cx="10" cy="10" r="9.3" />
          <polygon points="10,0.7 18.05,14.65 1.95,14.65" />
          <rect x="6.25" y="7.15" width="7.5" height="7.5" />
          <circle cx="10" cy="10.9" r="3.75" />
        </g>

        {/* Close */}
        <g style={glyph(open, -90)} strokeWidth="1.5">
          <path d="M5.4 5.4 14.6 14.6" />
          <path d="M14.6 5.4 5.4 14.6" />
        </g>
      </svg>
    </button>
  );
}
