"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
 *
 * Pinned to the bottom-right of the viewport and portalled to <body>, for the
 * same reason the panel is: it renders from inside the <header>, whose
 * backdrop-filter makes it the containing block for fixed descendants, so
 * `bottom` would resolve against the nav bar instead of the window.
 */
export function SynthToggleButton() {
  const open = useUIStore((s) => s.synthPanelOpen);
  const toggle = useUIStore((s) => s.toggleSynthPanel);

  // No document during SSR / the first render, so the portal waits a beat.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <button
      type="button"
      onClick={toggle}
      // Marks the seal as the panel's own control, so the panel's
      // press-outside-to-dismiss handler leaves this button to toggle.
      data-synth-toggle
      // Carried over from the header, where the seal used to live inside the
      // bar's [data-modal-hide] wrapper: the portal puts it outside that
      // element, so it needs its own attribute to keep fading out behind the
      // project modal. The chip below owns the colour transition — this
      // element's transition belongs to that rule.
      data-modal-hide
      aria-pressed={open}
      aria-label={open ? "Close synth panel" : "Open synth panel"}
      title={open ? "Close synth" : "Open synth"}
      // Sits on the same cream-frame rails as the panel (10px, widened by the
      // safe-area insets on notched devices), and above it — z-40 is the
      // panel — so the seal stays hittable while the panel is out.
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        right: "calc(env(safe-area-inset-right, 0px) + 16px)",
      }}
      className={`fixed z-50 ${open ? "cursor-zoom-out" : "cursor-zoom-in"}`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-[background-color,color,border-color] duration-300 ${
          open
            ? "border-white/10 bg-black/85 text-white hover:text-accent"
            : "border-black/5 bg-white/60 text-black hover:text-accent"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          // 20, not 24: the seal is drawn about (10,10) and spans the full 20
          // units, so a 24-unit box parked it up and to the left. Harmless when
          // the button had no background — now that it's a chip, it has to be
          // centered in it.
          viewBox="0 0 20 20"
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
      </span>
    </button>,
    document.body,
  );
}
