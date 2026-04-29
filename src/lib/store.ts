import { useMemo } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  DEFAULT_THEME,
  THEME_IDS,
  defaultMacrosFor,
  resolveSettings,
  type ThemeId,
} from "@/components/webgl/materials/shaders/themes";
import type { MacroValues, SynthSettings } from "@/lib/synthTypes";

// Re-export the synth types so existing import sites (`@/lib/store`) keep
// working without churn.
export type {
  FilterType,
  LfoShape,
  MacroValues,
  OscEngine,
  SynthSettings,
} from "@/lib/synthTypes";

type UIState = {
  synthPanelOpen: boolean;
  audioUnlocked: boolean;
  reducedMotion: boolean;
  muted: boolean;
  toggleSynthPanel: () => void;
  setSynthPanel: (open: boolean) => void;
  setAudioUnlocked: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setMuted: (v: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  synthPanelOpen: false,
  audioUnlocked: false,
  reducedMotion: false,
  muted: false,
  toggleSynthPanel: () =>
    set((s) => ({ synthPanelOpen: !s.synthPanelOpen })),
  setSynthPanel: (open) => set({ synthPanelOpen: open }),
  setAudioUnlocked: (v) => set({ audioUnlocked: v }),
  setReducedMotion: (v) => set({ reducedMotion: v }),
  setMuted: (v) => set({ muted: v }),
}));

// ── Theme + macro store ────────────────────────────────────────────────────
// The canonical state is `theme` + `macroValues[theme]`. The full
// `SynthSettings` consumed by the audio engine is derived via
// `resolveSettings`; keeping the source small means switching themes auto-
// loads the matching synth preset, and the panel only needs four sliders.

type MacrosByTheme = Record<ThemeId, MacroValues>;

const buildDefaultMacros = (): MacrosByTheme =>
  THEME_IDS.reduce<MacrosByTheme>((acc, id) => {
    acc[id] = defaultMacrosFor(id);
    return acc;
  }, {} as MacrosByTheme);

type ThemeStore = {
  theme: ThemeId;
  macros: MacrosByTheme;
  setTheme: (theme: ThemeId) => void;
  cycleTheme: () => void;
  setMacro: (index: 0 | 1 | 2 | 3, value: number) => void;
  resetMacros: () => void;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      macros: buildDefaultMacros(),
      setTheme: (theme) => set({ theme }),
      cycleTheme: () =>
        set((s) => {
          const idx = THEME_IDS.indexOf(s.theme);
          const next = THEME_IDS[(idx + 1) % THEME_IDS.length];
          return { theme: next };
        }),
      setMacro: (index, value) =>
        set((s) => {
          const current = s.macros[s.theme];
          const next: MacroValues = [
            current[0],
            current[1],
            current[2],
            current[3],
          ];
          next[index] = clamp01(value);
          return { macros: { ...s.macros, [s.theme]: next } };
        }),
      resetMacros: () =>
        set((s) => ({
          macros: { ...s.macros, [s.theme]: defaultMacrosFor(s.theme) },
        })),
    }),
    {
      name: "portfolio:theme",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Skip auto-hydration — `persist` running during SSR breaks the
      // useSyncExternalStore "stable server snapshot" contract and floods
      // the console with React warnings. We rehydrate explicitly after
      // mount via `useThemeStorePersistence` below.
      skipHydration: true,
      migrate: () => ({
        theme: DEFAULT_THEME,
        macros: buildDefaultMacros(),
      }),
      // Newly added themes won't have entries in old localStorage — fill them
      // in on rehydrate so we never read undefined.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const filled: MacrosByTheme = { ...buildDefaultMacros(), ...state.macros };
        state.macros = filled;
      },
    },
  ),
);

/**
 * Hook: resolved SynthSettings for the active theme + its macro values.
 *
 * Selectors must return referentially stable values across calls; doing the
 * resolveSettings() call directly in the selector returns a fresh object on
 * every read and trips React's `getServerSnapshot should be cached` guard.
 * Pull primitives, then memoize the resolution into a settings object.
 */
export function useResolvedSynthSettings(): SynthSettings {
  const theme = useThemeStore((s) => s.theme);
  const macros = useThemeStore((s) => s.macros[s.theme]);
  return useMemo(() => resolveSettings(theme, macros), [theme, macros]);
}

/** Hook: macro values for the active theme (stable array reference). */
export function useActiveMacros(): MacroValues {
  return useThemeStore((s) => s.macros[s.theme]);
}

/**
 * Mount once per app to read persisted localStorage state into the store.
 * Called from a top-level client component after mount so `persist` never
 * runs during SSR.
 */
export function rehydrateThemeStore() {
  if (typeof window === "undefined") return;
  void useThemeStore.persist?.rehydrate();
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
