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

// Re-export the synth types so existing import sites (`@/lib/store`) keep
// working without churn.
export type {
  FilterType,
  LfoShape,
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

// ── Intro store ──────────────────────────────────────────────────────────────
// Coordinates the first-load page-in animation across three separate React
// trees that can't share refs: the cream reveal overlay + hero headline (in
// HomeClient), the global header (in the root layout), and the CyclingWord roll
// (deep in the hero). IntroSequence owns the master GSAP timeline and flips
// these flags; the other pieces subscribe and react.
//
//   ready         — the shader painted its first real frame (or WebGL is
//                   unavailable / a safety timeout elapsed). The cue to begin
//                   the reveal. Set by InteractiveBackground.
//   headlinePlay  — the timeline has reached the headline phase. The hero word
//                   roll (CyclingWord) waits on this so it stays in sync with
//                   the headline flying up instead of rolling under the cream.

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

// ── Theme store ────────────────────────────────────────────────────────────
// The canonical state is just the active `theme`. Each theme maps 1:1 to a
// synth preset, so `resolveSettings(theme)` returns the full `SynthSettings`
// consumed by the audio engine — the sound is edited directly in the preset's
// `baseSettings`, with no macro layer on top.

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
      // v2 dropped the old per-theme `macros` map. v3 renamed the theme ids to
      // the seven Hermetic principles; `migrate` maps any old id to its new
      // one so a returning visitor keeps their selection, then falls back to
      // the default for anything unrecognized.
      version: 3,
      // Skip auto-hydration — `persist` running during SSR breaks the
      // useSyncExternalStore "stable server snapshot" contract and floods
      // the console with React warnings. We rehydrate explicitly after
      // mount via `rehydrateThemeStore` below.
      skipHydration: true,
      partialize: (s) => ({ theme: s.theme }),
      migrate: (persisted) => {
        const raw = (persisted as { theme?: string } | undefined)?.theme;
        // Old (pre-v3) id → Hermetic-principle id.
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

// ── Synth tweak store ──────────────────────────────────────────────────────
// The player's own adjustments, layered over whichever preset is active. Two
// kinds, both session-only (deliberately not persisted — a preset should sound
// like itself on a fresh visit):
//
//   octaveOffset — a global transpose added to the preset's `octave`. Stored as
//     an offset rather than an absolute register so switching themes keeps the
//     player's shift while each preset still contributes its own home register
//     (Vibration lives two octaves down; the offset rides on top of that).
//
//   overrides — absolute values for the handful of parameters the panel's
//     sliders expose. A parameter absent from the map means "use the preset's
//     value". The map is cleared whenever the theme changes (see the
//     subscription below the store), so every preset opens at its own
//     defaults and a slider you moved belongs to the theme you moved it on.

/** Bounds on the *effective* octave (preset + offset), keeping every mapped
 * note inside D1–C7 — audible, and on the piano roll. */
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

// A theme change hands every slider back to the new preset. Done here, at the
// store level, rather than in the theme buttons so it holds for every path
// that changes the theme — the panel's picker, the "chance" roll, cycleTheme,
// and the persisted-theme rehydrate on load (a no-op then: nothing is set yet).
useThemeStore.subscribe((s, prev) => {
  if (s.theme !== prev.theme) useSynthTweakStore.setState({ overrides: {} });
});

/**
 * Hook: resolved SynthSettings for the active theme, with the player's tweaks
 * (octave shift, slider overrides) merged in. This is the one place preset and
 * player meet — the engine and every UI readout consume the merged result, so
 * they can't disagree.
 *
 * Selectors must return referentially stable values across calls; doing the
 * resolveSettings() call directly in the selector returns a fresh object on
 * every read and trips React's `getServerSnapshot should be cached` guard.
 * Pull the theme primitive, then memoize the resolution into a settings object.
 */
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

/**
 * Mount once per app to read persisted localStorage state into the store.
 * Called from a top-level client component after mount so `persist` never
 * runs during SSR.
 */
export function rehydrateThemeStore() {
  if (typeof window === "undefined") return;
  void useThemeStore.persist?.rehydrate();
}
