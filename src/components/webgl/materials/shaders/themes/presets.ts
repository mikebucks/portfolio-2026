import type { MacroValues, SynthSettings } from "@/lib/synthTypes";
import { causationFragment } from "./causation";
import { correspondenceFragment } from "./correspondence";
import { genderFragment } from "./gender";
import { mindFragment } from "./mind";
import { polarityFragment } from "./polarity";
import { rhythmFragment } from "./rhythm";
import { vibrationFragment } from "./vibration";

// The seven Hermetic principles (The Kybalion), canonical order.
export type ThemeId =
  | "mind"
  | "correspondence"
  | "vibration"
  | "polarity"
  | "rhythm"
  | "causation"
  | "gender";

/** Shader + full synth voice + fixed uMacros. No macro layer. */
export type ThemePreset = {
  id: ThemeId;
  label: string;
  blurb: string;
  fragment: string;
  baseSettings: SynthSettings;
  /** Fixed 0..1 vec4 fed to the shader's uMacros. */
  shaderMacros: MacroValues;
};

// ── Mind · Mentalism ──
// Dream bells: FM a hair off the harmonic series so partials beat and shimmer.
const mindBase: SynthSettings = {
  oscEngine: "fm",
  oscWave: 0.22, // low index (≈4.5): glass, not clangor
  oscTimbre: 0.62, // harmonicity 2.98, the near-miss that shimmers

  octave: 1, // D4: chimes, with room for the octave-down shift

  filterType: "lowpass",
  filterCutoff: 3800,
  filterResonance: 1.6,
  filterEnvAmount: 0.35,

  attack: 0.002,
  decay: 0.9,
  sustain: 0.12,
  release: 2.2,

  lfoShape: "sine",
  lfoRate: 0.3,
  lfoAmount: 0.14,

  // Far from the LFO rate so the two never pattern.
  cycEnvRate: 0.18,
  cycEnvAmount: 0.3,

  glide: 0.0,

  delayTime: 0.42,
  delayFeedback: 0.55,
  delayWet: 0.34,
  reverbWet: 0.5,

  masterVolume: -4,
  visualReactivity: 0.8,
};

const mindPreset: ThemePreset = {
  id: "mind",
  label: "Mentalism",
  blurb: "The All is Mind; the Universe is Mental.",
  fragment: mindFragment,
  baseSettings: mindBase,
  shaderMacros: [0.45, 0.3, 0.25, 0.35],
};

// ── Correspondence ──
// Lush stacked-saw pad.
const correspondenceBase: SynthSettings = {
  oscEngine: "super",
  oscWave: 0.55,
  oscTimbre: 0.45,
  octave: 0,

  filterType: "lowpass",
  filterCutoff: 2400,
  filterResonance: 1.2,
  filterEnvAmount: 0.50,

  attack: 0.06,
  decay: 0.35,
  sustain: 0.7,
  release: 1.6,

  lfoShape: "triangle",
  lfoRate: 1.8,
  lfoAmount: 0.10,

  cycEnvRate: 0.8,
  cycEnvAmount: 0.0,

  glide: 0.0,

  delayTime: 0.32,
  delayFeedback: 0.32,
  delayWet: 0.20,
  reverbWet: 0.40,

  masterVolume: -4,
  visualReactivity: 0.75,
};

const correspondencePreset: ThemePreset = {
  id: "correspondence",
  label: "Correspondence",
  blurb: "As above, so below; as below, so above.",
  fragment: correspondenceFragment,
  baseSettings: correspondenceBase,
  shaderMacros: [0.55, 0.45, 0.3, 0.4],
};

// ── Vibration ──
// Junglist bass: lands immediately, knock on the front, growling mids.
const vibrationBase: SynthSettings = {
  // Narrow detune: a wide spread at D1 beats at ~1 Hz and cancels itself.
  oscEngine: "super",
  oscWave: 0.10,
  oscTimbre: 0.3,

  octave: -2, // ding lands on D1 (~37 Hz)

  // Cutoff sets perceived loudness here, not masterVolume: 620 Hz passes the
  // 4th–8th harmonics, which small speakers and ears can actually hear.
  filterType: "lowpass",
  filterCutoff: 620,
  filterResonance: 4.0,
  filterEnvAmount: 0.15, // 0.6 gave a tinny 3.5 kHz zap

  // Sustain is shared by amp and filter envs; lower reads as a pluck.
  attack: 0.001,
  decay: 0.10,
  sustain: 0.55,
  release: 0.25,

  // Shallow (±120 Hz) so cutoff never clips against the 40 Hz floor.
  lfoShape: "triangle",
  lfoRate: 0.7,
  lfoAmount: 0.05,

  // Out of step with the LFO so the two never pattern.
  cycEnvRate: 0.45,
  cycEnvAmount: 0.16,

  glide: 0.0, // PolySynth glide smears the note front

  delayTime: 0.16,
  delayFeedback: 0.20,
  delayWet: 0.06,
  reverbWet: 0.03,

  masterVolume: -1,
  visualReactivity: 0.95,
};

const vibrationPreset: ThemePreset = {
  id: "vibration",
  label: "Vibration",
  blurb: "Nothing rests; everything moves; everything vibrates.",
  fragment: vibrationFragment,
  baseSettings: vibrationBase,
  shaderMacros: [0.4, 0.45, 0.3, 0.4],
};

// ── Polarity ──
// Two-op FM bells, warm sustained pad.
const polarityBase: SynthSettings = {
  oscEngine: "fm",
  oscWave: 0.45,
  oscTimbre: 0.35,
  octave: 0,

  filterType: "lowpass",
  filterCutoff: 2600,
  filterResonance: 0.9,
  filterEnvAmount: 0.55,

  attack: 0.02,
  decay: 0.35,
  sustain: 0.5,
  release: 1.0,

  lfoShape: "sine",
  lfoRate: 1.2,
  lfoAmount: 0.08,

  cycEnvRate: 1.4,
  cycEnvAmount: 0.0,

  glide: 0.0,

  delayTime: 0.26,
  delayFeedback: 0.28,
  delayWet: 0.18,
  reverbWet: 0.35,

  masterVolume: -4,
  visualReactivity: 0.8,
};

const polarityPreset: ThemePreset = {
  id: "polarity",
  label: "Polarity",
  blurb: "Everything is dual; everything has poles; everything hadd its pair of opposites; like and unlike are the same; opposites are identical in nature, but different in deggree; extremes meet; all truths are but half-truths; all pardoxxes may be reconciled.",
  fragment: polarityFragment,
  baseSettings: polarityBase,
  // Scale / Flow / Spiral / Bloom. Spiral low: more stagger loses the torus form.
  shaderMacros: [0.5, 0.45, 0.22, 0.45],
};

// ── Rhythm ──
// Plucked Karplus strings: each key is a bob struck. Loudness lives in the
// noise burst (oscTimbre), not the tail.
const rhythmBase: SynthSettings = {
  oscEngine: "karplus",
  oscWave: 0.7,
  oscTimbre: 0.6, // ≈3.7 periods of noise: harder strike, same decay

  octave: 0,

  // Bite is the loudness; a 3.2 kHz corner trimmed it.
  filterType: "lowpass",
  filterCutoff: 4800,
  filterResonance: 0.6,
  filterEnvAmount: 0.0,

  attack: 0.005,
  decay: 0.4,
  sustain: 0.0,
  release: 1.2,

  lfoShape: "sine",
  lfoRate: 0.4,
  lfoAmount: 0.03,

  cycEnvRate: 0.5,
  cycEnvAmount: 0.0,

  glide: 0.04,

  delayTime: 0.38,
  delayFeedback: 0.45,
  delayWet: 0.30,
  reverbWet: 0.45,

  masterVolume: -1, // measured level with Gender and Causation
  visualReactivity: 0.8,
};

const rhythmPreset: ThemePreset = {
  id: "rhythm",
  label: "Rhythm",
  blurb: "Everything flows, out and in; everything has its tides; all things rise and fall; the pendulum-swing manifests in everything; the measure of the swing to the right is the measure of the swing to the left; rhythm compensates.",
  fragment: rhythmFragment,
  baseSettings: rhythmBase,
  // x Swing · y Wave · z Tempo · w Glow
  shaderMacros: [0.5, 0.55, 0.45, 0.55],
};

// ── Causation · Cause & Effect ──
// Drawbar organ with a resonant filter pluck on the front of each note.
const causationBase: SynthSettings = {
  // Low timbre keeps even harmonics in; high thins to odd-only (clarinet).
  oscEngine: "harmonic",
  oscWave: 0.62,
  oscTimbre: 0.25,
  octave: 0,

  filterType: "lowpass",
  filterCutoff: 2000,
  filterResonance: 2.2,
  filterEnvAmount: 0.3,

  attack: 0.012,
  decay: 0.18,
  sustain: 0.85,
  release: 0.5,

  // Rotary-speaker flutter.
  lfoShape: "sine",
  lfoRate: 5.6,
  lfoAmount: 0.05,

  // Out of step with the LFO so the two never pattern.
  cycEnvRate: 0.35,
  cycEnvAmount: 0.1,

  glide: 0.0,

  delayTime: 0.22,
  delayFeedback: 0.3,
  delayWet: 0.12,
  reverbWet: 0.3,

  masterVolume: -4,
  visualReactivity: 0.85,
};

const causationPreset: ThemePreset = {
  id: "causation",
  label: "Cause & Effect",
  blurb: "Every cause has its Effect; every Effect has its Cause; enerything happens according to Law; Chance is but a name for Law not recognixed; there are many planes of causation, but nothing escapes the Law",
  fragment: causationFragment,
  baseSettings: causationBase,
  // x Glow · y Density · z Drift · w Echo
  shaderMacros: [0.4, 0.45, 0.4, 0.5],
};

// ── Gender ──
// Bright resonant analog lead, acid.
const genderBase: SynthSettings = {
  oscEngine: "analog",
  oscWave: 0.7,
  oscTimbre: 0.5,
  octave: 0,

  filterType: "lowpass",
  filterCutoff: 2600,
  filterResonance: 3.2,
  filterEnvAmount: 0.7,

  attack: 0.004,
  decay: 0.14,
  sustain: 0.35,
  release: 0.35,

  lfoShape: "sawtooth",
  lfoRate: 5.5,
  lfoAmount: 0.12,

  cycEnvRate: 1.2,
  cycEnvAmount: 0.0,

  glide: 0.06,

  delayTime: 0.19,
  delayFeedback: 0.42,
  delayWet: 0.22,
  reverbWet: 0.18,

  masterVolume: -7,
  visualReactivity: 0.9,
};

const genderPreset: ThemePreset = {
  id: "gender",
  label: "Gender",
  blurb: "Gender is in everything; everything has its Masculine and Feminine Principles; Gender manifests on all planes.",
  fragment: genderFragment,
  baseSettings: genderBase,
  shaderMacros: [0.5, 0.5, 0.35, 0.4],
};

export const THEME_PRESETS: Record<ThemeId, ThemePreset> = {
  mind: mindPreset,
  correspondence: correspondencePreset,
  vibration: vibrationPreset,
  polarity: polarityPreset,
  rhythm: rhythmPreset,
  causation: causationPreset,
  gender: genderPreset,
};

export const THEME_IDS: readonly ThemeId[] = [
  "mind",
  "correspondence",
  "vibration",
  "polarity",
  "rhythm",
  "causation",
  "gender",
] as const;

export const DEFAULT_THEME: ThemeId = "correspondence";

export function resolveSettings(theme: ThemeId): SynthSettings {
  return THEME_PRESETS[theme].baseSettings;
}
