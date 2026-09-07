import { useMemo } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  DEFAULT_THEME,
  THEME_IDS,
  resolveSettings,
  type ThemeId,
} from "@/components/webgl/materials/shaders/themes";
import type { SynthSettings } from "@/lib/synthTypes";

export type {
  FilterType,
  LfoShape,
  OscEngine,
  SynthSettings,
} from "@/lib/synthTypes";

type UIState = {
  synthPanelOpen: boolean;
  toggleSynthPanel: () => void;
  setSynthPanel: (open: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  synthPanelOpen: false,
  toggleSynthPanel: () =>
    set((s) => ({ synthPanelOpen: !s.synthPanelOpen })),
  setSynthPanel: (open) => set({ synthPanelOpen: open }),
}));

// Intro flags shared across React trees that can't share refs.
// ready: shader painted (set by InteractiveBackground). headlinePlay: timeline reached the headline.
type IntroStore = {
  ready: boolean;
  headlinePlay: boolean;
  setReady: () => void;
  setHeadlinePlay: () => void;
};

export const useIntroStore = create<IntroStore>((set) => ({
  ready: false,
  headlinePlay: false,
  setReady: () => set({ ready: true }),
  setHeadlinePlay: () => set({ headlinePlay: true }),
}));

// Each theme maps 1:1 to a synth preset; resolveSettings(theme) gives the SynthSettings.
type ThemeStore = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  cycleTheme: () => void;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      setTheme: (theme) => set({ theme }),
      cycleTheme: () =>
        set((s) => {
          const idx = THEME_IDS.indexOf(s.theme);
          const next = THEME_IDS[(idx + 1) % THEME_IDS.length];
          return { theme: next };
        }),
    }),
    {
      name: "portfolio:theme",
      storage: createJSONStorage(() => localStorage),
      version: 3,
      // persist during SSR breaks useSyncExternalStore; rehydrateThemeStore runs after mount.
      skipHydration: true,
      partialize: (s) => ({ theme: s.theme }),
      migrate: (persisted) => {
        const raw = (persisted as { theme?: string } | undefined)?.theme;
        // pre-v3 ids
        const RENAMED: Record<string, ThemeId> = {
          cellular: "mind",
          aurora: "correspondence",
          pulse: "vibration",
          ember: "polarity",
          tide: "rhythm",
          static: "causation",
          neon: "gender",
        };
        const t = raw && raw in RENAMED ? RENAMED[raw] : (raw as ThemeId);
        return { theme: t && THEME_IDS.includes(t) ? t : DEFAULT_THEME };
      },
    },
  ),
);

// Player tweaks over the active preset. Session-only, deliberately not persisted.
// octaveOffset is relative so a theme switch keeps the shift; overrides clear on theme change.

/** Bounds on the effective octave (preset + offset): keeps notes in D1-C7. */
export const OCTAVE_SHIFT_MIN = -2;
export const OCTAVE_SHIFT_MAX = 2;

export type SynthOverrideKey =
  | "masterVolume"
  | "filterCutoff"
  | "reverbWet"
  | "delayWet"
  | "delayFeedback";

type SynthTweakState = {
  octaveOffset: number;
  overrides: Partial<Record<SynthOverrideKey, number>>;
  setOctaveOffset: (offset: number) => void;
  /** `null` clears the override, handing the parameter back to the preset. */
  setOverride: (key: SynthOverrideKey, value: number | null) => void;
};

export const useSynthTweakStore = create<SynthTweakState>((set) => ({
  octaveOffset: 0,
  overrides: {},
  setOctaveOffset: (octaveOffset) => set({ octaveOffset }),
  setOverride: (key, value) =>
    set((s) => {
      const overrides = { ...s.overrides };
      if (value === null) delete overrides[key];
      else overrides[key] = value;
      return { overrides };
    }),
}));

// Store-level so every theme-change path resets the sliders.
useThemeStore.subscribe((s, prev) => {
  if (s.theme !== prev.theme) useSynthTweakStore.setState({ overrides: {} });
});

/** Active preset merged with the player's tweaks. Memoized: selectors must return stable refs. */
export function useResolvedSynthSettings(): SynthSettings {
  const theme = useThemeStore((s) => s.theme);
  const octaveOffset = useSynthTweakStore((s) => s.octaveOffset);
  const overrides = useSynthTweakStore((s) => s.overrides);
  return useMemo(() => {
    const base = resolveSettings(theme);
    return {
      ...base,
      ...overrides,
      octave: Math.min(
        OCTAVE_SHIFT_MAX,
        Math.max(OCTAVE_SHIFT_MIN, base.octave + octaveOffset),
      ),
    };
  }, [theme, octaveOffset, overrides]);
}

/** Call once after mount so `persist` never runs during SSR. */
export function rehydrateThemeStore() {
  if (typeof window === "undefined") return;
  void useThemeStore.persist?.rehydrate();
}
