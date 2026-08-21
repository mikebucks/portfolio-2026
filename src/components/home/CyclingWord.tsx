"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { setPointerClicksLocked, triggerClick } from "@/lib/visualEvents";
import { useIntroStore } from "@/lib/store";

// The headline reveals "Designer" out of the intro, then flips through the
// roles like an old subway departure board: each letter rolls up out of the
// slot on its own, its replacement rolling in from below a beat behind it,
// the whole word turning over in a left-to-right wave. It lands — permanently
// — on "Builder". Builder only ever appears as the final resting word.
const WORDS = ["Designer", "Engineer", "Thinker", "Builder"];

// One line, expressed in the headline's leading so the roll aligns to the text.
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

    // Rest the layout on the final word: point the sizer (which gives the
    // root its width and baseline) at "Builder" and release the px width the
    // roll animated, so the underline keeps hugging the word across font-size
    // breakpoints long after the animation is gone.
    const settle = () => {
      sizer.textContent = WORDS[last];
      gsap.set(root, { width: "auto" });
    };

    // Reduced motion: skip the roll and rest on the final word ("Builder").
    // Checked inline (rather than via @/lib/device) so editing this file's
    // timing doesn't invalidate the device chunk that InteractiveBackground
    // lazy-loads — that coupling was causing HMR ChunkLoadErrors on every edit.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      words.forEach((w, i) => gsap.set(w, { autoAlpha: i === last ? 1 : 0 }));
      settle();
      return;
    }

    // Every word after the opener waits below the slot, ready to roll in.
    // (They're also visibility-hidden inline from SSR, so nothing stacks up
    // before this runs; autoAlpha overrides that inline style from here on.)
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

    // Fire a shader "click" at the on-screen center of the word slot — same
    // signal a real pointer-down sends (normalized -1..1, y flipped). The
    // full-bleed background canvas fills the viewport, so its rect IS the
    // viewport and we can map straight off innerWidth/innerHeight. Measured at
    // call time so scroll/resize can't stale the coordinates.
    const pulseBackground = () => {
      const rect = root.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      triggerClick(
        (cx / window.innerWidth) * 2 - 1,
        -((cy / window.innerHeight) * 2 - 1),
      );
    };

    // Offset from the intro's headlinePlay cue to the headline being settled
    // and readable — the H1's fly-up starts 0.45s after the cue and runs 0.9s
    // (see IntroSequence). Rolling before this lands would move the word while
    // it's still arriving.
    const REVEAL = 1.15;
    // ...then hold "Designer" this long before the roll starts, so it reads as
    // the headline's own word rather than the first frame of an animation.
    const HOLD = 1.5;

    let tl: gsap.core.Timeline | null = null;

    // Runs exactly once per mount, on load. Scrolling back up to the hero does
    // NOT replay it: the roll is part of the page's arrival, and re-running it
    // every time the hero re-enters the viewport turned a one-time flourish
    // into a loop you couldn't scroll past. "Builder" is the resting headline,
    // so leaving it there is the correct end state anyway.
    const play = () => {
      // The roll pulses the background itself on every word landing, so a
      // pointer click during it stacks a second wavefront onto the headline's
      // own. Mute pointer clicks for the duration; onComplete releases them,
      // and so does teardown, since a killed timeline never completes.
      setPointerClicksLocked(true);

      tl = gsap.timeline({
        delay: REVEAL + HOLD,
        onComplete: () => {
          setPointerClicksLocked(false);
          settle();
        },
      });

      let at = 0;
      for (let i = 1; i < WORDS.length; i++) {
        const out = letters[i - 1];
        const inc = letters[i];

        // The underline (inset-x-0 on the root) rides this width tween, so it
        // re-hugs each word as it arrives. Function-based value: measured when
        // the tween starts, not when the timeline is built, so a late font
        // load can't bake in stale widths.
        tl.to(
          root,
          { width: () => words[i].offsetWidth, duration: WIDTH, ease: "power2.inOut" },
          at,
        );

        tl.set(words[i], { autoAlpha: 1 }, at);
        tl.to(
          out,
          { yPercent: -105, duration: FLIP, ease: "power2.in", stagger: STAGGER },
          at,
        );
        tl.to(
          inc,
          { yPercent: 0, duration: FLIP, ease: "back.out(1.3)", stagger: STAGGER },
          at + IN_LAG,
        );

        const outEnd = at + FLIP + (out.length - 1) * STAGGER;
        const inEnd = at + IN_LAG + FLIP + (inc.length - 1) * STAGGER;
        tl.set(words[i - 1], { autoAlpha: 0 }, outEnd);
        // Ripple the background from the word's center as it lands — as if the
        // headline itself clicked the shader on each role change.
        tl.call(pulseBackground, undefined, at + IN_LAG + FLIP);
        // Advance past the roll, plus a linger to read it — except the final
        // word, which just rests as the headline.
        at = Math.max(outEnd, inEnd) + (i < last ? LINGER : 0);
      }
    };

    // Hold the roll until the intro reveals the headline, so "Designer" rolls
    // out of the H1 as it flies up rather than under the cream cover. On a
    // re-entry to the home route the flag is already set, so this fires now.
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
      unsubIntro();
      tl?.kill();
      // kill() skips onComplete — without this the lock outlives the component
      // and clicks stay dead for the rest of the session.
      setPointerClicksLocked(false);
    };
  }, []);

  return (
    <span
      ref={rootRef}
      className="relative inline-block whitespace-nowrap align-baseline"
      aria-label={WORDS[WORDS.length - 1]}
    >
      {/* Reserves inline width + baseline so the surrounding text lays out
          normally. Starts as the opening word (also what SSR shows); settle()
          rewrites it to the resting word once the roll is done, and the width
          tween owns the in-between. */}
      <span ref={sizerRef} className="invisible" aria-hidden>
        {WORDS[0]}
      </span>

      {/* Hairline under the slot. inset-x-0, so it tracks the root's width
          tween and always hugs the word currently in the slot. */}
      <span
        aria-hidden
        className="absolute inset-x-0 bg-current"
        style={{ height: "0.045em", bottom: "-0.06em" }}
      />

      {/* One row per word, stacked in the same slot. Each row clips its own
          letters vertically (overflow-hidden at the line height), so a letter
          mid-roll shears off at the slot edge like a real departure board —
          and a narrowing slot never clips a wider outgoing word sideways. */}
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
