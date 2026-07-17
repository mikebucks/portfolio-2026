"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

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

    const ctx = gsap.context(() => {
      // Reveal "Designer" out of the intro (~1.1s) and let it linger before the
      // first roll.
      const tl = gsap.timeline({ delay: 1.9 });

      for (let i = 1; i < WORDS.length; i++) {
        tl.to(track, {
          yPercent: -step * i,
          duration: 0.4,
          ease: "power4.inOut",
        });
        // Linger long enough to read — but not on the final word, which just
        // rests as the headline.
        if (i < WORDS.length - 1) tl.to({}, { duration: 0.8 });
      }
    }, track);

    return () => ctx.revert();
  }, []);

  return (
    <span className="relative inline-block whitespace-nowrap align-baseline">
      {/* Reserves inline width + baseline so the surrounding text lays out
          normally. Matches the resting word ("Builder"). */}
      <span className="invisible" aria-hidden>
        Builder
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
