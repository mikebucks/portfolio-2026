"use client";

import { useEffect, useRef } from "react";
import { useAudio } from "./AudioProvider";
import {
  KEYBOARD_NOTES,
  shiftOctave,
  shouldIgnoreTarget,
} from "./keyboardMapping";
import { useUIStore } from "@/lib/store";

/**
 * Wires keyboard + touch to the synth engine. Mounted on the home page only.
 *
 * Secret UI chord: A + S + D held together for ~800ms.
 *
 * Architecture note: the window listeners are attached ONCE (empty-dep effect)
 * and read every volatile value (audio context, unlock, unlocked flag, panel
 * toggle) through refs. This is deliberate — binding these handlers to React
 * identities meant the effect tore down and re-ran the moment `unlocked`
 * flipped on the very first keypress, discarding the in-flight `activeKeyNotes`
 * map so the first note's keyup landed on a fresh empty map and never released.
 * Keeping listeners stable and state in refs eliminates that whole class of
 * stuck-note bug.
 */
export function useSynthControls() {
  const audio = useAudio();
  const { unlock, unlocked } = audio;
  const toggleSynthPanel = useUIStore((s) => s.toggleSynthPanel);

  const held = useRef(new Set<string>());
  const chordTimer = useRef<number | null>(null);
  const activeKeyNotes = useRef(new Map<string, string>());

  // Live refs so the attach-once handlers always see current values. `unlock`
  // in particular closes over `settings`; reading a stale copy would build the
  // engine from an old preset, so it must come through the ref, not a closure.
  const audioRef = useRef(audio);
  const unlockRef = useRef(unlock);
  const unlockedRef = useRef(unlocked);
  const toggleRef = useRef(toggleSynthPanel);
  useEffect(() => {
    audioRef.current = audio;
    unlockRef.current = unlock;
    unlockedRef.current = unlocked;
    toggleRef.current = toggleSynthPanel;
  });

  useEffect(() => {
    // Release every sounding note and clear all input state. Shared by keyup
    // fallbacks (blur / visibility / pagehide) and unmount.
    const releaseAll = () => {
      const engine = audioRef.current.engine;
      for (const [, note] of activeKeyNotes.current) engine?.noteOff(note);
      activeKeyNotes.current.clear();
      held.current.clear();
      if (chordTimer.current) {
        clearTimeout(chordTimer.current);
        chordTimer.current = null;
      }
      engine?.releaseAll();
    };

    const handleDown = async (e: KeyboardEvent) => {
      if (shouldIgnoreTarget(e.target)) return;

      // Panel toggle: Cmd/Ctrl + Shift + S.
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "s"
      ) {
        e.preventDefault();
        toggleRef.current();
        return;
      }

      // A system modifier (Cmd/Ctrl) came down. Browsers — macOS especially —
      // often swallow the keyup for any music key held across this, which would
      // strand it. Release everything on the transition rather than only
      // blocking new attacks.
      if (e.metaKey || e.ctrlKey) {
        releaseAll();
        return;
      }

      const key = e.key.toLowerCase();
      if (held.current.has(key)) return;
      held.current.add(key);

      // Secret chord: A + S + D held together for 800ms.
      if (["a", "s", "d"].every((k) => held.current.has(k))) {
        if (chordTimer.current === null) {
          chordTimer.current = window.setTimeout(() => {
            toggleRef.current();
            chordTimer.current = null;
          }, 800);
        }
      }

      const baseNote = KEYBOARD_NOTES[key];
      if (!baseNote) return;

      e.preventDefault();
      if (!unlockedRef.current) await unlockRef.current();

      // The unlock above is async (Tone import + start). If the key was
      // released during that gap, its keyup already ran — don't strand a note
      // with no pending release.
      if (!held.current.has(key)) return;

      let note = baseNote;
      if (e.shiftKey) note = shiftOctave(note, 1);
      else if (e.altKey) note = shiftOctave(note, -1);

      audioRef.current.engine?.noteOn(note, 0.75);
      activeKeyNotes.current.set(key, note);
    };

    const handleUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      held.current.delete(key);

      if (
        chordTimer.current &&
        !["a", "s", "d"].every((k) => held.current.has(k))
      ) {
        clearTimeout(chordTimer.current);
        chordTimer.current = null;
      }

      const note = activeKeyNotes.current.get(key);
      if (note) {
        audioRef.current.engine?.noteOff(note);
        activeKeyNotes.current.delete(key);
      }
    };

    const handleVisibility = () => {
      if (document.hidden) releaseAll();
    };

    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", releaseAll);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
      window.removeEventListener("blur", releaseAll);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", releaseAll);
      // Navigating away / unmounting while a key is held must not strand audio,
      // since the engine lives in layout context above this component.
      releaseAll();
    };
  }, []);
}
