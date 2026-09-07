"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useIntroStore, useUIStore } from "@/lib/store";
import { SynthKeyCap } from "./SynthKeyCap";
import { SynthToggleIcon, synthToggleChipClass } from "./SynthToggleIcon";
import { primeAudioContext } from "./primeAudioContext";

// First four keys only; the panel has the rest.
const STRIP_KEYS = ["a", "s", "d", "f"];

// Seconds after the intro's headlinePlay cue: on the H1's heels (see
// IntroSequence), clear of the word roll at 1.9s.
const AFTER_HEADLINE = 0.6;

// Cleared once landed. `transition` included: [data-modal-hide]'s stylesheet
// transition would otherwise chase GSAP's frames and smear the spring.
const BLOB_PROPS = "transform,transformOrigin,opacity,visibility,filter,transition";

// The dot a chip blobs out of and back into.
const PARKED = {
  scale: 0.3,
  autoAlpha: 0,
  filter: "blur(6px)",
  transformOrigin: "50% 50%",
  transition: "none",
} as const;

// Spotlight-style spring in. Only scale springs; opacity/blur clear on a plain
// ease so the chip reads solid early and opacity never overshoots.
function blobIn(tl: gsap.core.Timeline, items: Element[], at = 0) {
  tl.to(
    items,
    { scale: 1, duration: 0.9, ease: "elastic.out(1, 0.55)", stagger: 0.09 },
    at,
  );
  tl.to(
    items,
    {
      autoAlpha: 1,
      filter: "blur(0px)",
      duration: 0.3,
      ease: "power2.out",
      stagger: 0.09,
    },
    at,
  );
}

// Reverse: quicker, back.in wind-up, fade trails the shrink.
function blobOut(tl: gsap.core.Timeline, items: Element[], at = 0) {
  tl.to(
    items,
    { scale: 0.3, duration: 0.35, ease: "back.in(2.5)", stagger: 0.06 },
    at,
  );
  tl.to(
    items,
    {
      autoAlpha: 0,
      filter: "blur(6px)",
      duration: 0.25,
      ease: "power2.in",
      stagger: 0.06,
    },
    at + 0.1,
  );
}

/**
 * Fixed open/close control for the synth panel, with a playable A S D F strip.
 * Portalled to <body>: the header's backdrop-filter would trap fixed children.
 */
export function SynthToggleButton() {
  const open = useUIStore((s) => s.synthPanelOpen);
  const toggle = useUIStore((s) => s.toggleSynthPanel);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const stripRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLButtonElement>(null);

  // Inline rather than @/lib/device: same HMR reason as CyclingWord.
  const reducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Intro arrival, seal first then F D S A. Not in IntroSequence's timeline:
  // the strip is portalled, so it isn't in the DOM when that's built.
  // Keyed on `mounted`: refs are empty until the portal renders.
  useLayoutEffect(() => {
    if (!mounted) return;
    const strip = stripRef.current;
    const seal = sealRef.current;
    if (!strip || !seal) return;

    // Cue already past or reduced motion: rest state.
    if (useIntroStore.getState().headlinePlay || reducedMotion()) return;

    const caps = Array.from(strip.children);
    gsap.set([seal, ...caps], PARKED);

    let tl: gsap.core.Timeline | null = null;
    const play = () => {
      // Read at play time: caps stay parked if the panel is already up.
      const capsIn = !useUIStore.getState().synthPanelOpen;
      const items = capsIn ? [seal, ...[...caps].reverse()] : [seal];
      tl = gsap.timeline({ delay: AFTER_HEADLINE });
      blobIn(tl, items);
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
      gsap.set([seal, ...caps], { clearProps: BLOB_PROPS });
    };
  }, [mounted]);

  // Caps leave while the panel is up (its keyboard has them, bigger) and
  // return on close. Skips the mount run: an already-open panel just parks them.
  const capsTl = useRef<gsap.core.Timeline | null>(null);
  const openSeen = useRef<boolean | null>(null);
  useEffect(() => {
    if (!mounted) return;
    const strip = stripRef.current;
    if (!strip) return;
    const caps = Array.from(strip.children);

    if (openSeen.current === null) {
      openSeen.current = open;
      if (open) gsap.set(caps, PARKED);
      return;
    }
    if (openSeen.current === open) return;
    openSeen.current = open;

    // Killing their tweens also lifts the caps out of the intro timeline.
    capsTl.current?.kill();
    gsap.killTweensOf(caps);

    if (reducedMotion()) {
      if (open) gsap.set(caps, PARKED);
      else gsap.set(caps, { clearProps: BLOB_PROPS });
      return;
    }

    const tl = gsap.timeline({ onComplete: () => (capsTl.current = null) });
    if (open) {
      gsap.set(caps, { transformOrigin: "50% 50%", transition: "none" });
      blobOut(tl, caps);
      // Parked caps keep the inline dot; that's what hides them.
    } else {
      gsap.set(caps, PARKED);
      blobIn(tl, [...caps].reverse());
      // Timeline step, not onComplete set(): tweens made in a callback
      // aren't reliably rendered.
      tl.set(caps, { clearProps: BLOB_PROPS });
    }
    capsTl.current = tl;
  }, [mounted, open]);

  if (!mounted) return null;

  return createPortal(
    // Rides the content column (gutter-x + mx-auto max-w-[1600px]), not the
    // window corner, so it lands in the footer's marks-row gap at any width.
    // No scrollbar compensation: inset-x-0 on a fixed box already excludes it
    // (Chrome device emulation disagrees; that's the emulator).
    // Bottom inset = the footer's bottom padding. Change one, change both.
    <div
      aria-hidden={false}
      style={{ bottom: "calc(2.5rem + env(safe-area-inset-bottom, 0px))" }}
      // z-105: above hovered project cards (101) and frame bars (100), under
      // the scrolled header (110) and project modal (120).
      className="pointer-events-none fixed inset-x-0 z-[105] gutter-x"
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-end gap-1.5">
        {/* Real caps: same keydown path as a physical press. `solid`, since
            outline caps vanish over the shader. Hidden below sm: 224px wide. */}
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
          // Prime inside the tap: the panel-open path unlocks from a passive
          // effect, after iOS's activation is gone.
          onClick={() => {
            primeAudioContext();
            toggle();
          }}
          // Exempts the seal from the panel's press-outside dismiss.
          data-synth-toggle
          // Portalled outside the header's [data-modal-hide]; needs its own to
          // fade behind the project modal.
          data-modal-hide
          aria-pressed={open}
          aria-label={open ? "Close synth panel" : "Open synth panel"}
          title={open ? "Close synth" : "Open synth"}
          className="pointer-events-auto cursor-pointer"
        >
          <span className={synthToggleChipClass(open)}>
            {/* 40 fills the chip; the icon carries the padding in its own box. */}
            <SynthToggleIcon open={open} size={40} />
          </span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
