"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { setPointerClicksLocked, triggerClick } from "@/lib/visualEvents";
import { useIntroStore } from "@/lib/store";

// The headline reveals "Designer" out of the intro, then rolls through the
// roles marquee-style and lands — permanently — on "Builder". Builder only
// ever appears as the final resting word.
const WORDS = ["Designer", "Engineer", "Thinker", "Builder"];

// One line, expressed in the headline's leading so the roll aligns to the text.
const LINE = "1.2em";

export function CyclingWord() {
  const trackRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const step = 100 / WORDS.length; // each word occupies 1/N of the track

    // Reduced motion: skip the roll and rest on the final word ("Builder").
    // Checked inline (rather than via @/lib/device) so editing this file's
    // timing doesn't invalidate the device chunk that InteractiveBackground
    // lazy-loads — that coupling was causing HMR ChunkLoadErrors on every edit.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(track, { yPercent: -step * (WORDS.length - 1) });
      return;
    }

    const ROLL = 0.35; // duration of each upward roll
    const LINGER = 1.5; // pause between rolls so each word can be read

    // Fire a shader "click" at the on-screen center of the word slot — same
    // signal a real pointer-down sends (normalized -1..1, y flipped). The
    // full-bleed background canvas fills the viewport, so its rect IS the
    // viewport and we can map straight off innerWidth/innerHeight. Measured at
    // call time so scroll/resize can't stale the coordinates.
    const slot = track.parentElement ?? track;
    const pulseBackground = () => {
      const rect = slot.getBoundingClientRect();
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
        onComplete: () => setPointerClicksLocked(false),
      });

      let at = 0;
      for (let i = 1; i < WORDS.length; i++) {
        tl.to(
          track,
          { yPercent: -step * i, duration: ROLL, ease: "power3.inOut" },
          at,
        );
        // Ripple the background from the word's center as it lands — as if the
        // headline itself clicked the shader on each role change.
        tl.call(pulseBackground, undefined, at + ROLL);
        // Advance past the roll, plus a linger to read it — except the final
        // word, which just rests as the headline.
        at += ROLL + (i < WORDS.length - 1 ? LINGER : 0);
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
    <span className="relative inline-block whitespace-nowrap align-baseline">
      {/* Reserves inline width + baseline so the surrounding text lays out
          normally. Sized to the WIDEST role, not the resting one ("Builder"):
          the roll overlay is absolutely positioned, so a slot only wide enough
          for "Builder" lets "Designer" hang ~33px past the headline box — on a
          400px viewport that spills off-screen and adds a horizontal scroll. */}
      <span className="invisible" aria-hidden>
        Designer
      </span>

      {/* Overlay carries the animated roll without disturbing the text baseline. */}
      <span
        className="absolute left-0 top-0 overflow-hidden"
        style={{ height: LINE }}
        aria-label="Builder"
      >
        <span ref={trackRef} className="flex flex-col">
          {WORDS.map((word, i) => (
            <span
              key={i}
              className="block leading-[1.2]"
              style={{ height: LINE }}
              aria-hidden={i !== 0}
            >
              {word}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
