"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SynthEngine } from "./createSynthEngine";
import { useSynthStore, useUIStore } from "@/lib/store";

type AudioContextValue = {
  unlocked: boolean;
  unlock: () => Promise<void>;
  engine: SynthEngine | null;
};

const AudioCtx = createContext<AudioContextValue | null>(null);

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error("useAudio must be used inside AudioProvider");
  return ctx;
}

/**
 * Lazy audio provider: Tone.js is only imported after an explicit gesture
 * (pointerdown / keydown / touchstart) so the initial JS stays small and
 * autoplay restrictions are respected.
 */
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const engineRef = useRef<SynthEngine | null>(null);
  const unlockingRef = useRef<Promise<void> | null>(null);

  const settings = useSynthStore((s) => s.settings);
  const setAudioUnlocked = useUIStore((s) => s.setAudioUnlocked);

  const unlock = useCallback(async () => {
    if (engineRef.current) return;
    if (unlockingRef.current) return unlockingRef.current;

    const run = (async () => {
      const [Tone, { createSynthEngine }] = await Promise.all([
        import("tone"),
        import("./createSynthEngine"),
      ]);
      await Tone.start();
      engineRef.current = createSynthEngine(Tone, settings);
      setUnlocked(true);
      setAudioUnlocked(true);
    })();

    unlockingRef.current = run;
    try {
      await run;
    } finally {
      unlockingRef.current = null;
    }
  }, [settings, setAudioUnlocked]);

  // Keep engine in sync with settings as user tweaks the panel.
  useEffect(() => {
    engineRef.current?.applySettings(settings);
  }, [settings]);

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const value = useMemo<AudioContextValue>(
    () => ({
      unlocked,
      unlock,
      get engine() {
        return engineRef.current;
      },
    }),
    [unlocked, unlock],
  );

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}
