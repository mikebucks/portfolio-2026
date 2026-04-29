import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  DEFAULT_THEME,
  THEME_IDS,
  type ThemeId,
} from "@/components/webgl/materials/shaders/themes";

export type SynthSettings = {
  oscillatorType: "sine" | "triangle" | "sawtooth" | "square";
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filterCutoff: number; // Hz
  filterResonance: number;
  delayWet: number;
  delayTime: number;
  delayFeedback: number;
  reverbWet: number;
  masterVolume: number; // dB
  visualReactivity: number; // 0..1
};

export const DEFAULT_SYNTH: SynthSettings = {
  oscillatorType: "triangle",
  attack: 0.01,
  decay: 0.2,
  sustain: 0.6,
  release: 0.9,
  filterCutoff: 2400,
  filterResonance: 0.6,
  delayWet: 0.2,
  delayTime: 0.28,
  delayFeedback: 0.3,
  reverbWet: 0.18,
  masterVolume: -10,
  visualReactivity: 0.7,
};

type UIState = {
  synthPanelOpen: boolean;
  audioUnlocked: boolean;
  reducedMotion: boolean;
  muted: boolean;
  theme: ThemeId;
  toggleSynthPanel: () => void;
  setSynthPanel: (open: boolean) => void;
  setAudioUnlocked: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setMuted: (v: boolean) => void;
  setTheme: (theme: ThemeId) => void;
  cycleTheme: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  synthPanelOpen: false,
  audioUnlocked: false,
  reducedMotion: false,
  muted: false,
  theme: DEFAULT_THEME,
  toggleSynthPanel: () =>
    set((s) => ({ synthPanelOpen: !s.synthPanelOpen })),
  setSynthPanel: (open) => set({ synthPanelOpen: open }),
  setAudioUnlocked: (v) => set({ audioUnlocked: v }),
  setReducedMotion: (v) => set({ reducedMotion: v }),
  setMuted: (v) => set({ muted: v }),
  setTheme: (theme) => set({ theme }),
  cycleTheme: () =>
    set((s) => {
      const idx = THEME_IDS.indexOf(s.theme);
      const next = THEME_IDS[(idx + 1) % THEME_IDS.length];
      return { theme: next };
    }),
}));

type SynthStore = {
  settings: SynthSettings;
  set: <K extends keyof SynthSettings>(key: K, value: SynthSettings[K]) => void;
  reset: () => void;
};

export const useSynthStore = create<SynthStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SYNTH,
      set: (key, value) =>
        set((s) => ({ settings: { ...s.settings, [key]: value } })),
      reset: () => set({ settings: DEFAULT_SYNTH }),
    }),
    {
      name: "portfolio:synth",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
