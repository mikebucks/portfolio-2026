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
import {
  rehydrateThemeStore,
  useResolvedSynthSettings,
  useUIStore,
} from "@/lib/store";

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
 * Lazy audio provider: Tone.js is imported and the AudioContext started only on
 * explicit synth intent — a mapped synth key or opening the synth panel — not
 * on the first gesture anywhere. The synth is an easter egg, so a casual visitor
 * who only scrolls or clicks a link never pays the Tone bundle + audio-graph
 * cost. `unlock` is called from `useSynthControls` (mapped keys and panel open);
 * both paths run inside a real user gesture, so the browser's autoplay policy is
 * still satisfied.
 */
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const engineRef = useRef<SynthEngine | null>(null);
  const unlockingRef = useRef<Promise<void> | null>(null);

  // Pull persisted theme state out of localStorage once on mount.
  // Skipping persist during SSR keeps useSyncExternalStore happy.
  useEffect(() => {
    rehydrateThemeStore();
  }, []);

  const settings = useResolvedSynthSettings();
  const setAudioUnlocked = useUIStore((s) => s.setAudioUnlocked);

  const unlock = useCallback(async () => {
    if (engineRef.current) return;
    if (unlockingRef.current) return unlockingRef.current;

    // Before the first await, while the caller's user gesture is still live:
    // create and resume the raw AudioContext. iOS Safari refuses a resume()
    // issued from the far side of the dynamic import below — the gesture's
    // activation has expired by then — so the context has to start here and
    // be handed to Tone once it loads.
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
