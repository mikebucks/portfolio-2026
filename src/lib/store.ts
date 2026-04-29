import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  DEFAULT_THEME,
  THEME_IDS,
  type ThemeId,
} from "@/components/webgl/materials/shaders/themes";

export type OscEngine =
  | "analog"
  | "super"
  | "fm"
  | "harmonic"
  | "karplus"
  | "noise";

export type FilterType = "lowpass" | "bandpass" | "highpass";

export type LfoShape = "sine" | "triangle" | "square" | "sawtooth";

export type SynthSettings = {
  // Digital oscillator (MicroFreak-style: Type / Wave / Timbre)
  oscEngine: OscEngine;
  oscWave: number; // 0..1 primary morph
  oscTimbre: number; // 0..1 secondary morph

  // Analog-style filter
  filterType: FilterType;
  filterCutoff: number; // Hz
  filterResonance: number;
  filterEnvAmount: number; // -1..1 envelope → cutoff

  // ADSR (VCA)
  attack: number;
  decay: number;
  sustain: number;
  release: number;

  // LFO
  lfoShape: LfoShape;
  lfoRate: number; // Hz
  lfoAmount: number; // 0..1 amount routed to cutoff

  // Cycling envelope (looping LFO routed to oscillator timbre)
  cycEnvRate: number; // Hz
  cycEnvAmount: number; // 0..1

  // Performance
  glide: number; // seconds portamento

  // Effects (browser additions, not on the hardware)
  delayTime: number;
  delayFeedback: number;
  delayWet: number;
  reverbWet: number;

  // Master
  masterVolume: number; // dB
  visualReactivity: number; // 0..1
};

export const DEFAULT_SYNTH: SynthSettings = {
  oscEngine: "super",
  oscWave: 0.45,
  oscTimbre: 0.35,

  filterType: "lowpass",
  filterCutoff: 2200,
  filterResonance: 1.4,
  filterEnvAmount: 0.45,

  attack: 0.02,
  decay: 0.22,
  sustain: 0.55,
  release: 0.9,

  lfoShape: "triangle",
  lfoRate: 4.2,
  lfoAmount: 0.12,

  cycEnvRate: 1.6,
  cycEnvAmount: 0.0,

  glide: 0.0,

  delayTime: 0.28,
  delayFeedback: 0.32,
  delayWet: 0.18,
  reverbWet: 0.22,

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
      version: 2,
      migrate: () => ({ settings: DEFAULT_SYNTH }),
    },
  ),
);
