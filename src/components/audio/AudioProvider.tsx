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
import { primeAudioContext } from "./primeAudioContext";
import { rehydrateThemeStore, useResolvedSynthSettings } from "@/lib/store";

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
 * Lazy: Tone.js loads only on synth intent (mapped key or panel open),
 * so casual visitors never pay for the bundle. `unlock` runs inside a gesture.
 */
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const engineRef = useRef<SynthEngine | null>(null);
  const unlockingRef = useRef<Promise<void> | null>(null);

  // Rehydrate after mount; persisting during SSR breaks useSyncExternalStore.
  useEffect(() => {
    rehydrateThemeStore();
  }, []);

  const settings = useResolvedSynthSettings();

  const unlock = useCallback(async () => {
    if (engineRef.current) return;
    if (unlockingRef.current) return unlockingRef.current;

    // Before any await: iOS needs resume() inside the gesture.
    const rawContext = primeAudioContext();

    const run = (async () => {
      const [Tone, { createSynthEngine }] = await Promise.all([
        import("tone"),
        import("./createSynthEngine"),
      ]);
      Tone.setContext(rawContext);
      await Tone.start();
      engineRef.current = createSynthEngine(Tone, settings);
      setUnlocked(true);
    })();

    unlockingRef.current = run;
    try {
      await run;
    } finally {
      unlockingRef.current = null;
    }
  }, [settings]);

  useEffect(() => {
    engineRef.current?.applySettings(settings);
  }, [settings]);

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
