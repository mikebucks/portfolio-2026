"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { triggerClick } from "@/lib/visualEvents";

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

    const ROLL = 0.25; // duration of each upward roll
    const LINGER = 1; // pause between rolls so each word can be read

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

    let tl: gsap.core.Timeline | null = null;
    // The very first roll is timed to reveal "Designer" out of the hero intro
    // (~1.1s) and linger; replays after scrolling back to the hero start sooner.
    let firstPlay = true;

    const play = () => {
      // Kill any in-flight roll and restart from "Designer".
      tl?.kill();
      gsap.set(track, { yPercent: 0 });

      tl = gsap.timeline({ delay: firstPlay ? 1.15 : 0.4 });

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
      firstPlay = false;
    };

    // Play once now (hero is visible on load), then replay on every genuine
    // re-entry. The `wasOut` latch means we only retrigger after the hero has
    // actually left the viewport — not on the intersection jitter Lenis's
    // momentum scroll produces as the section settles at the top.
    const section = track.closest("section") ?? track;
    let wasOut = false;

    play();

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          wasOut = true;
        } else if (wasOut) {
          wasOut = false;
          play();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(section);

    return () => {
      io.disconnect();
      tl?.kill();
    };
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
