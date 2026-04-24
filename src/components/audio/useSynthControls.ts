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
 */
export function useSynthControls() {
  const { unlock, unlocked } = useAudio();
  const audio = useAudio();
  const toggleSynthPanel = useUIStore((s) => s.toggleSynthPanel);

  const held = useRef(new Set<string>());
  const chordTimer = useRef<number | null>(null);

  useEffect(() => {
    const activeKeyNotes = new Map<string, string>();

    const handleDown = async (e: KeyboardEvent) => {
      if (shouldIgnoreTarget(e.target)) return;

      // Panel toggle: Cmd/Ctrl + Shift + S.
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "s"
      ) {
        e.preventDefault();
        toggleSynthPanel();
        return;
      }

      const key = e.key.toLowerCase();
      if (held.current.has(key)) return;
      held.current.add(key);

      // Secret chord: A + S + D held together for 800ms.
      if (["a", "s", "d"].every((k) => held.current.has(k))) {
        if (chordTimer.current === null) {
          chordTimer.current = window.setTimeout(() => {
            toggleSynthPanel();
            chordTimer.current = null;
          }, 800);
        }
      }

      const baseNote = KEYBOARD_NOTES[key];
      if (!baseNote) return;

      e.preventDefault();
      if (!unlocked) await unlock();

      let note = baseNote;
      if (e.shiftKey) note = shiftOctave(note, 1);
      else if (e.altKey) note = shiftOctave(note, -1);

      audio.engine?.noteOn(note, 0.75);
      activeKeyNotes.set(key, note);
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

      const note = activeKeyNotes.get(key);
      if (note) {
        audio.engine?.noteOff(note);
        activeKeyNotes.delete(key);
      }
    };

    const handleBlur = () => {
      for (const [, note] of activeKeyNotes) audio.engine?.noteOff(note);
      activeKeyNotes.clear();
      held.current.clear();
      if (chordTimer.current) {
        clearTimeout(chordTimer.current);
        chordTimer.current = null;
      }
    };

    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
      window.removeEventListener("blur", handleBlur);
      if (chordTimer.current) clearTimeout(chordTimer.current);
    };
  }, [audio, unlock, unlocked, toggleSynthPanel]);
}
