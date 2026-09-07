"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { setPointerClicksLocked, triggerClick } from "@/lib/visualEvents";
import { useIntroStore } from "@/lib/store";

// Departure-board roll through the roles after the intro, resting on the last
// word. Clicking the slot rolls one word forward, wrapping.
const WORDS = ["Designer", "Engineer", "Thinker", "Builder"];

// One line at the headline's leading.
const LINE = "1.2em";

export function CyclingWord() {
  const rootRef = useRef<HTMLSpanElement>(null);
  const sizerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const sizer = sizerRef.current;
    if (!root || !sizer) return;

    const words = Array.from(root.querySelectorAll<HTMLElement>("[data-word]"));
    const letters = words.map((w) => Array.from(w.children) as HTMLElement[]);
    const last = WORDS.length - 1;

    // Clicks are ignored while busy, including before the intro roll finishes.
    let current = 0;
    let busy = true;

    // Rest on word i: sizer sets width/baseline; drop the tweened px width.
    const settle = (i: number) => {
      sizer.textContent = WORDS[i];
      gsap.set(root, { width: "auto" });
      root.setAttribute("aria-label", WORDS[i]);
    };

    // Inline, not @/lib/device: importing it caused HMR ChunkLoadErrors.
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduced) {
      words.forEach((w, i) => gsap.set(w, { autoAlpha: i === last ? 1 : 0 }));
      current = last;
      busy = false;
      settle(last);

      const swap = () => {
        const next = (current + 1) % WORDS.length;
        gsap.set(words[current], { autoAlpha: 0 });
        gsap.set(words[next], { autoAlpha: 1 });
        current = next;
        settle(next);
      };
      root.addEventListener("click", swap);
      return () => root.removeEventListener("click", swap);
    }

    // Park every word after the opener below the slot.
    words.forEach((w, i) => {
      if (i > 0) {
        gsap.set(w, { autoAlpha: 0 });
        gsap.set(letters[i], { yPercent: 105 });
      }
    });

    const FLIP = 0.35; // one letter's travel through the slot
    const STAGGER = 0.045; // left-to-right delay between neighbouring letters
    const IN_LAG = 0.1; // an incoming letter trails its outgoing counterpart
    const WIDTH = 0.4; // slot/underline re-hug duration
    const LINGER = 1.5; // pause between rolls so each word can be read

    // Shader click at the slot's center (normalized -1..1, y flipped).
    const pulseBackground = () => {
      const rect = root.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      triggerClick(
        (cx / window.innerWidth) * 2 - 1,
        -((cy / window.innerHeight) * 2 - 1),
      );
    };

    // headlinePlay cue → headline landed (IntroSequence: 0.45s delay + 0.9s).
    const REVEAL = 1.15;
    // Hold the opener before rolling.
    const HOLD = 0.75;

    let tl: gsap.core.Timeline | null = null;

    // Roll `from` out and `to` in at `at`; returns landing time.
    // `pulse`: ripple the shader on landing (a real click already did).
    const addRoll = (
      timeline: gsap.core.Timeline,
      from: number,
      to: number,
      at: number,
      pulse: boolean,
    ) => {
      const out = letters[from];
      const inc = letters[to];

      // Function value: measured at tween start, so a late font load can't stale it.
      timeline.to(
        root,
        { width: () => words[to].offsetWidth, duration: WIDTH, ease: "power2.inOut" },
        at,
      );

      // Re-park below: on a wrapped cycle they're still above the slot.
      timeline.set(inc, { yPercent: 105 }, at);
      timeline.set(words[to], { autoAlpha: 1 }, at);
      timeline.to(
        out,
        { yPercent: -105, duration: FLIP, ease: "power2.in", stagger: STAGGER },
        at,
      );
      timeline.to(
        inc,
        { yPercent: 0, duration: FLIP, ease: "back.out(1.3)", stagger: STAGGER },
        at + IN_LAG,
      );

      const outEnd = at + FLIP + (out.length - 1) * STAGGER;
      const inEnd = at + IN_LAG + FLIP + (inc.length - 1) * STAGGER;
      timeline.set(words[from], { autoAlpha: 0 }, outEnd);
      if (pulse) timeline.call(pulseBackground, undefined, at + IN_LAG + FLIP);
      return Math.max(outEnd, inEnd);
    };

    // Once per mount, never replayed on scroll-back.
    const play = () => {
      // Pointer clicks would stack a second wavefront on the roll's own pulses.
      setPointerClicksLocked(true);

      tl = gsap.timeline({
        delay: REVEAL + HOLD,
        onComplete: () => {
          setPointerClicksLocked(false);
          current = last;
          busy = false;
          settle(last);
          tl = null;
        },
      });

      let at = 0;
      for (let i = 1; i < WORDS.length; i++) {
        const end = addRoll(tl, i - 1, i, at, true);
        at = end + (i < last ? LINGER : 0);
      }
    };

    const cycle = () => {
      if (busy) return;
      busy = true;
      const next = (current + 1) % WORDS.length;

      tl = gsap.timeline({
        onComplete: () => {
          current = next;
          busy = false;
          settle(next);
          tl = null;
        },
      });
      addRoll(tl, current, next, 0, false);
    };
    root.addEventListener("click", cycle);

    // Wait for the intro to reveal the headline (already set on re-entry).
    let unsubIntro = () => {};
    if (useIntroStore.getState().headlinePlay) {
      play();
    } else {
      unsubIntro = useIntroStore.subscribe((s) => {
        if (s.headlinePlay) {
          unsubIntro();
          play();
        }
      });
    }

    return () => {
      root.removeEventListener("click", cycle);
      unsubIntro();
      tl?.kill();
      // kill() skips onComplete, which would leave the lock on.
      setPointerClicksLocked(false);
    };
  }, []);

  return (
    <span
      ref={rootRef}
      className="relative inline-block cursor-ns-resize select-none whitespace-nowrap align-baseline"
      aria-label={WORDS[WORDS.length - 1]}
    >
      {/* Sizer: reserves width + baseline; settle() rewrites it. */}
      <span ref={sizerRef} className="invisible" aria-hidden>
        {WORDS[0]}
      </span>

      {/* Underline; inset-x-0 so it rides the root's width tween. */}
      <span
        aria-hidden
        className="absolute inset-x-0 bg-current"
        style={{ height: "0.045em", bottom: "-0.06em" }}
      />

      {/* One row per word, stacked; each clips its own letters at line height. */}
      {WORDS.map((word, w) => (
        <span
          key={w}
          data-word
          aria-hidden
          className="absolute left-0 top-0 overflow-hidden whitespace-nowrap leading-[1.2]"
          style={{ height: LINE, visibility: w === 0 ? undefined : "hidden" }}
        >
          {word.split("").map((ch, i) => (
            <span key={i} className="inline-block will-change-transform">
              {ch}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}
