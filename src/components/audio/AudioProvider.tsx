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
 * Lazy audio provider: Tone.js is imported and the AudioContext started only
 * after the user's first gesture, so the initial JS stays small and the
 * browser's autoplay policy is satisfied. Browsers never prompt for audio —
 * they just keep the context suspended until a gesture — so we treat the first
 * pointer/key/touch anywhere as the opt-in (see the auto-unlock effect below).
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

  // Auto-unlock on the first user gesture anywhere on the page. `unlock` closes
  // over the latest `settings`, so read it through a ref rather than baking a
  // stale copy into the once-attached listeners.
  const unlockRef = useRef(unlock);
  useEffect(() => {
    unlockRef.current = unlock;
  });

  useEffect(() => {
    if (unlocked) return;
    const onFirstGesture = () => {
      void unlockRef.current();
      detach();
    };
    // Idempotent: unlock() guards against a second engine, so racing with a
    // mapped keypress (which also unlocks) is harmless.
    const detach = () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
      window.removeEventListener("touchstart", onFirstGesture);
    };
    window.addEventListener("pointerdown", onFirstGesture);
    window.addEventListener("keydown", onFirstGesture);
    window.addEventListener("touchstart", onFirstGesture);
    return detach;
  }, [unlocked]);

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
