"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useUIStore } from "@/lib/store";
import { SynthToggleIcon, synthToggleChipClass } from "./SynthToggleIcon";
import { primeAudioContext } from "./primeAudioContext";

/**
 * The panel's fixed open/close control: a piano key (SynthToggleIcon, shared
 * with the hero row's toggle) that turns into a close cross while the panel
 * is up.
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
          {/* The shared chip look — same black/white flood as the hero row's
              toggle. Solid plates, so the old backdrop-blur went with them. */}
          <span className={synthToggleChipClass(open)}>
            {/* Size 40 fills the chip — the icon carries the chip's padding
                inside its own box, so the ink lands where the design puts it. */}
            <SynthToggleIcon open={open} size={40} />
          </span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
