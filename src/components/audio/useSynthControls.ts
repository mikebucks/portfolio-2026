"use client";

import { useEffect, useRef } from "react";
import { useAudio } from "./AudioProvider";
import {
  KEYBOARD_NOTES,
  shiftOctave,
  shouldIgnoreTarget,
} from "./keyboardMapping";
import { primeAudioContext } from "./primeAudioContext";
import { useUIStore } from "@/lib/store";

/**
 * Keyboard → synth engine. Home page only. Secret chord: A+S+D held 800ms.
 * Listeners attach once and read volatile values through refs; re-running the
 * effect mid-keypress dropped the first note's release.
 */
export function useSynthControls() {
  const audio = useAudio();
  const { unlock, unlocked } = audio;
  const toggleSynthPanel = useUIStore((s) => s.toggleSynthPanel);
  const synthPanelOpen = useUIStore((s) => s.synthPanelOpen);

  const held = useRef(new Set<string>());
  const chordTimer = useRef<number | null>(null);
  const activeKeyNotes = useRef(new Map<string, string>());

  // Stale `unlock` would build the engine from an old preset.
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

  // Opening the panel is synth intent: unlock then.
  useEffect(() => {
    if (synthPanelOpen && !unlockedRef.current) void unlockRef.current();
  }, [synthPanelOpen]);

  useEffect(() => {
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

      // macOS swallows keyups for keys held across a Cmd/Ctrl press.
      if (e.metaKey || e.ctrlKey) {
        releaseAll();
        return;
      }

      const key = e.key.toLowerCase();
      if (held.current.has(key)) return;
      held.current.add(key);

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
      if (!unlockedRef.current) {
        await unlockRef.current();
      } else {
        // iOS suspends the context on interruptions; only a gesture resumes it.
        primeAudioContext();
      }

      // Released during the async unlock.
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
      // Engine outlives this hook.
      releaseAll();
    };
  }, []);
}
