"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useIntroStore, useUIStore } from "@/lib/store";
import { SynthKeyCap } from "./SynthKeyCap";
import { SynthToggleIcon, synthToggleChipClass } from "./SynthToggleIcon";
import { primeAudioContext } from "./primeAudioContext";

// Just the first four keys, not the full mapping: enough to say "these play",
// with the panel one press away for the rest.
const STRIP_KEYS = ["a", "s", "d", "f"];

// Offset from the intro's headlinePlay cue to the strip starting to blob in.
// The H1's fly-up starts 0.45s after the cue and runs 0.9s of expo.out (see
// IntroSequence), so by 1.05s it has all but landed — the strip is the last
// thing to arrive, and it should read as arriving *after* the headline, not
// alongside it. Well clear of the word roll too, which waits until 1.9s.
const AFTER_HEADLINE = 1.05;

// Properties the blob-in animates, cleared once it lands so the chips rest
// on their stylesheet values (and so a killed timeline can't strand one
// half-scaled or invisible). `transition` is in the list because the seal
// wears [data-modal-hide], whose stylesheet transition on opacity/transform
// would otherwise chase every frame GSAP writes and smear the spring into a
// slow fade; it's switched off for the duration and handed back after.
const BLOB_PROPS = "transform,transformOrigin,opacity,visibility,filter,transition";

/**
 * The panel's fixed open/close control: a piano key (SynthToggleIcon) that
 * turns into a close cross while the panel is up, with a playable A S D F
 * strip beside it. The site's only synth toggle.
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

  const stripRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLButtonElement>(null);

  // The strip's part in the page-load intro: the last thing to arrive, after
  // the headline. Each chip blobs out of nothing the way Spotlight's search
  // field does on macOS — springs up from a small, soft-edged dot and settles
  // with a little overshoot — one after another from the right: the seal
  // first, then F, D, S, A.
  //
  // This can't live in IntroSequence's master timeline: the strip is
  // portalled, so it isn't in the DOM when that timeline is built. Instead it
  // parks itself hidden here (before paint, so there's no flash of chips
  // ahead of the cream lifting) and waits on the same headlinePlay cue the
  // word roll uses, offsetting from it to land after the H1.
  //
  // Keyed on `mounted` because the portal only renders after the first
  // effect — the refs are empty until then.
  useLayoutEffect(() => {
    if (!mounted) return;
    const strip = stripRef.current;
    const seal = sealRef.current;
    if (!strip || !seal) return;

    // Cue already past (re-mount after the intro played) or reduced motion:
    // rest state, no animation. Checked inline rather than via @/lib/device
    // for the same HMR reason as CyclingWord.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (useIntroStore.getState().headlinePlay || reduced) return;

    // Right to left: seal, then the caps in reverse document order.
    const items = [seal, ...Array.from(strip.children).reverse()];

    gsap.set(items, {
      scale: 0.3,
      autoAlpha: 0,
      filter: "blur(6px)",
      transformOrigin: "50% 50%",
      transition: "none",
    });

    let tl: gsap.core.Timeline | null = null;
    const play = () => {
      tl = gsap.timeline({ delay: AFTER_HEADLINE });
      // Two tracks at once, same stagger. Only the scale springs: the opacity
      // and blur clear on a short plain ease, so the chip reads as solid by
      // the time the spring is still settling — a blob firming up, not a
      // photo coming into focus — and the opacity never overshoots past 1
      // and dips back, which the elastic would do to it.
      tl.to(items, {
        scale: 1,
        duration: 0.9,
        ease: "elastic.out(1, 0.55)",
        stagger: 0.09,
      });
      tl.to(
        items,
        {
          autoAlpha: 1,
          filter: "blur(0px)",
          duration: 0.3,
          ease: "power2.out",
          stagger: 0.09,
        },
        0,
      );
      tl.set(items, { clearProps: BLOB_PROPS });
    };

    const unsub = useIntroStore.subscribe((s) => {
      if (s.headlinePlay) {
        unsub();
        play();
      }
    });

    return () => {
      unsub();
      tl?.kill();
      gsap.set(items, { clearProps: BLOB_PROPS });
    };
  }, [mounted]);

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
      <div className="mx-auto flex max-w-[1600px] items-center justify-end gap-1.5">
        {/* The synth's front door: a playable A S D F strip beside the seal.
            It used to sit under the hero headline, but the seal alone never got
            pressed — nothing said it did anything, let alone made sound. Key
            caps that light up and play on hover do, and next to the toggle they
            also say what the toggle is for. Real SynthKeyCaps, so they walk the
            same synthetic-keydown path as a physical press and stay lit in sync
            with the footer's strip and the panel's keyboard. `solid`, because
            over the hero's shader an outline-only cap all but disappears.
            Hidden below sm: four 40px caps plus the seal is 224px, most of a
            phone's width, pinned over the content for the whole visit. */}
        <div
          ref={stripRef}
          data-modal-hide
          className="pointer-events-auto hidden items-center gap-1.5 sm:flex"
        >
          {STRIP_KEYS.map((k) => (
            <SynthKeyCap key={k} keyName={k} size="md" tone="solid" showNote />
          ))}
        </div>
        <button
          ref={sealRef}
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
          {/* The chip look: same solid black plate as the caps beside it, but
              a circle where they are squares — same family, different action.
              Solid plates, so the old backdrop-blur went with them. */}
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
