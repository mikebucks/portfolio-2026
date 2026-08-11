"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useUIStore } from "@/lib/store";
import {
  CloseGlyph,
  PhilosophersSealGlyph,
  PHILOSOPHERS_SEAL_CENTER,
  PHILOSOPHERS_SEAL_VIEW_BOX,
} from "@/components/icons";
import { primeAudioContext } from "./primeAudioContext";

// The two glyphs share the seal's (10,10) center and cross-fade through a
// quarter turn in opposite directions, so opening reads as the mark rotating
// into a cross rather than two icons cutting. Written as inline style rather
// than utility classes because `transform-box: view-box` has to be explicit —
// without it, older engines resolve the rotation about the SVG's border box
// and the glyph swings off-center.
const glyph = (visible: boolean, hiddenDeg: number) => ({
  transformBox: "view-box" as const,
  transformOrigin: `${PHILOSOPHERS_SEAL_CENTER}px ${PHILOSOPHERS_SEAL_CENTER}px`,
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
    // The seal rides the site's content column, not the window's corner. It has
    // to land in the gap at the end of the footer's marks row (see Footer), and
    // that row's right edge is the column's — the gutter on a narrow viewport,
    // and past max-w-[1600px] the centred cap, which on a wide screen is a
    // couple of hundred px in from the window edge. A hard-coded `right` can
    // only match one width.
    //
    // So rather than recompute that inset with calc(), this wrapper is laid out
    // with the same two primitives the column itself uses — `gutter-x` and
    // `mx-auto max-w-[1600px]` — and the button is flushed to its end. Fixed,
    // so it's the *viewport's* copy of that column and tracks it while the page
    // scrolls. Nothing to keep in sync: change the column and this follows.
    //
    // No scrollbar compensation here, deliberately: `inset-x-0` on a fixed box
    // resolves against the viewport with the scrollbar gutter already taken out,
    // the same edge the footer's flow content stops at. Subtracting a scrollbar
    // width on top of that pulls the seal a scrollbar's width in from the column
    // and opens a gap. (Chrome's device-emulation mode reports metrics where the
    // two disagree — that's the emulator, not the browser. Don't "fix" it.)
    //
    // Only the button takes pointer events; the wrapper spans the full width
    // and would otherwise swallow clicks across the bottom of the page.
    //
    // Bottom inset matches the footer's own bottom padding, so at full scroll
    // the seal sits exactly on the marks row. Change one, change both.
    <div
      aria-hidden={false}
      style={{ bottom: "calc(2.5rem + env(safe-area-inset-bottom, 0px))" }}
      // z-105 rather than the 50 it used to hold: a hovered featured card takes
      // z-101 (see FeaturedProjects) and would otherwise slide over the seal as
      // the pointer crossed the row. Above the cream frame bars (100) too, which
      // costs nothing — the bars are inset+10px and the seal clears them. Still
      // under the scrolled header (110) and the project modal (120), where it's
      // meant to fade out rather than float.
      className="pointer-events-none fixed inset-x-0 z-[105] gutter-x"
    >
      <div className="mx-auto flex max-w-[1600px] justify-end">
        <button
          type="button"
          // Priming here, not just in `unlock`, because the panel-open path runs
          // unlock from a passive effect — after this tap's activation is gone on
          // iOS. Start the context inside the tap; unlock then reuses it.
          onClick={() => {
            primeAudioContext();
            toggle();
          }}
          // Marks the seal as the panel's own control, so the panel's
          // press-outside-to-dismiss handler leaves this button to toggle.
          data-synth-toggle
          // Carried over from the header, where the seal used to live inside the
          // bar's [data-modal-hide] wrapper: the portal puts it outside that
          // element, so it needs its own attribute to keep fading out behind the
          // project modal.
          data-modal-hide
          aria-pressed={open}
          aria-label={open ? "Close synth panel" : "Open synth panel"}
          title={open ? "Close synth" : "Open synth"}
          className="pointer-events-auto cursor-pointer"
        >
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-[background-color,color,border-color] duration-300 ${
              open
                ? "bg-black/85 text-white hover:text-accent"
                : "bg-white text-black hover:text-accent"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              // Fills the 40px chip rather than sitting inside it at 24: the
              // seal was redrawn in Figma with the chip's padding baked into
              // its box, so the mark only spans about 26 of its 40 units. At 24
              // it would render a third smaller than the artwork; at 40 the ink
              // lands exactly where the design puts it, and the chip stands in
              // for the white plate the export draws under the mark.
              width="40"
              height="40"
              viewBox={PHILOSOPHERS_SEAL_VIEW_BOX}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {/* Both glyphs come from @/components/icons — they're drawn on
                  the same 40-unit grid, which is what lets them share this one
                  <svg> and rotate about a common center.

                  paper="none" because this chip is the white plate the artwork
                  was drawn on, and it's deliberately translucent — an opaque
                  triangle would punch a solid wedge through the backdrop blur.
                  Nothing in the mark needs it: only the inner circle's fill is
                  load-bearing, knocking itself out of the solid square. */}
              <PhilosophersSealGlyph paper="none" style={glyph(!open, 90)} />
              <CloseGlyph style={glyph(open, -90)} />
            </svg>
          </span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
