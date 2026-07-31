import type { MacroValues, SynthSettings } from "@/lib/synthTypes";
import { causationFragment } from "./causation";
import { correspondenceFragment } from "./correspondence";
import { genderFragment } from "./gender";
import { mindFragment } from "./mind";
import { polarityFragment } from "./polarity";
import { rhythmFragment } from "./rhythm";
import { vibrationFragment } from "./vibration";

// Themes are named for the seven Hermetic principles (The Kybalion), in their
// canonical order: Mentalism, Correspondence, Vibration, Polarity, Rhythm,
// Cause & Effect, Gender.
export type ThemeId =
  | "mind"
  | "correspondence"
  | "vibration"
  | "polarity"
  | "rhythm"
  | "causation"
  | "gender";

/**
 * A theme bundles a shader, its sound, and the fixed visual constants that
 * feed the shader. There is no macro layer: `baseSettings` is the entire
 * synth voice and is edited directly.
 */
export type ThemePreset = {
  id: ThemeId;
  label: string;
  blurb: string;
  fragment: string;
  /** The sole sound source for this theme. */
  baseSettings: SynthSettings;
  /**
   * Fixed 0..1 vec4 fed to the shader's `uMacros`. Formerly live macro-slider
   * values; now per-theme visual constants so each background keeps its look.
   */
  shaderMacros: MacroValues;
};

// ── Mind · Mentalism ─────────────────────────────────────────────────────────
// "The All is Mind." Crystalline FM pad through a soft, slow filter.
const mindBase: SynthSettings = {
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

  masterVolume: -12,
  visualReactivity: 0.8,
};

const mindPreset: ThemePreset = {
  id: "mind",
  label: "Mind",
  blurb: "The All is Mind; the Universe is Mental.",
  fragment: mindFragment,
  baseSettings: mindBase,
  shaderMacros: [0.45, 0.3, 0.25, 0.35],
};

// ── Correspondence ───────────────────────────────────────────────────────────
// "As above, so below." Lush stacked-saw pad — wide, shimmering ambient.
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

  masterVolume: -10,
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

// ── Vibration ────────────────────────────────────────────────────────────────
// "Nothing rests; everything vibrates." Junglist bassline synth — fundamental
// on from the first cycle, a short knock on the front, warm growling mids under
// it. Everything here is tuned for a bass that lands immediately: detune kept
// narrow so the stack can't cancel itself, and the filter envelope kept low so
// the attack is a knock rather than a bright zap.
const vibrationBase: SynthSettings = {
  // Four saws at ~8 cents. Wide detune is what makes a Reese, but down at D1 a
  // 46-cent spread beats at roughly 1 Hz — the stack partially cancels itself
  // about half a second in, which reads as the bass arriving late. Narrow
  // spread keeps the saws reinforcing, so the note is at full weight instantly;
  // the grind comes from resonance and the master drive instead.
  oscEngine: "super",
  oscWave: 0.10,
  oscTimbre: 0.3,

  // Two octaves down. The shared handpan mapping starts at D3, which is
  // baritone territory — the ding lands on D1 (~37 Hz) here.
  octave: -2,

  // Cutoff is what sets this preset's perceived loudness, not masterVolume.
  // Two octaves down, almost all of the voice's energy sits between 37 and
  // 260 Hz — a region where the ear needs roughly 20dB more level for the same
  // loudness, and where most laptop speakers can barely move air at all. Adding
  // gain there just drives the -1dB master limiter and gets clamped back, which
  // is why turning it up did nothing.
  //
  // Opening the corner to ~620 Hz lets the 4th through 8th harmonics of the
  // low notes through. Those sit where hearing and small drivers are both at
  // their best, and they carry the loudness the fundamental cannot — the note
  // is still as deep, it just becomes audible.
  filterType: "lowpass",
  filterCutoff: 620,
  filterResonance: 4.0,
  filterEnvAmount: 0.15,

  // The knock: opens to ~1.4kHz for 100ms, then settles near 1.1kHz. Kept well
  // short of the 3.5kHz sweep an earlier 0.6 env amount produced — that was the
  // tinny zap.
  //
  // Sustain is shared by the amp and filter envelopes, so it can't go low for
  // punch without the note itself dropping to a pluck. 0.55 holds the line and
  // the short decay carries the attack instead.
  attack: 0.001,
  decay: 0.10,
  sustain: 0.55,
  release: 0.25,

  // Slow filter drift, shallow enough (±120 Hz) that the cutoff nevera
  // approaches the 40 Hz floor and starts clipping against it.
  lfoShape: "triangle",
  lfoRate: 0.7,
  lfoAmount: 0.05,

  // Resonance itself crawls ±1 — the scrape. Deliberately not in step with the
  // filter LFO, so the two never settle into an audible pattern.
  cycEnvRate: 0.45,
  cycEnvAmount: 0.16,

  // No portamento. On a PolySynth each voice slides from whatever it last
  // played, which smears the front of the note — fatal for a bassline.
  glide: 0.0,

  // Bass wants to stay dry and forward — the wet chain is only there to keep
  // it from sounding pasted on.
  delayTime: 0.16,
  delayFeedback: 0.20,
  delayWet: 0.06,
  reverbWet: 0.03,

  masterVolume: -7,
  visualReactivity: 0.95,
};

const vibrationPreset: ThemePreset = {
  id: "vibration",
  label: "Vibration",
  blurb: "Nothing rests; everything moves and vibrates.",
  fragment: vibrationFragment,
  baseSettings: vibrationBase,
  shaderMacros: [0.4, 0.45, 0.3, 0.4],
};

// ── Polarity ─────────────────────────────────────────────────────────────────
// "Everything is dual." Two-op FM bells — metallic warmth, swelling cycle.
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

  masterVolume: -10,
  visualReactivity: 0.8,
};

const polarityPreset: ThemePreset = {
  id: "polarity",
  label: "Polarity",
  blurb: "Everything is dual; all truths are half-truths.",
  fragment: polarityFragment,
  baseSettings: polarityBase,
  shaderMacros: [0.5, 0.3, 0.4, 0.45],
};

// ── Rhythm ───────────────────────────────────────────────────────────────────
// "All things rise and fall." Plucked Karplus strings — long tail, watery delay.
const rhythmBase: SynthSettings = {
  oscEngine: "karplus",
  oscWave: 0.7,
  oscTimbre: 0.4,
  octave: 0,

  filterType: "lowpass",
  filterCutoff: 3200,
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

  masterVolume: -9,
  visualReactivity: 0.8,
};

const rhythmPreset: ThemePreset = {
  id: "rhythm",
  label: "Rhythm",
  blurb: "Everything flows, out and in; all things rise and fall.",
  fragment: rhythmFragment,
  baseSettings: rhythmBase,
  shaderMacros: [0.45, 0.4, 0.35, 0.4],
};

// ── Causation · Cause & Effect ───────────────────────────────────────────────
// "Every cause has its effect." Filtered noise — wind / surf through a resonant
// band. The one non-pitched engine: the keyboard gives rhythmic control while
// the base settings shape color and motion. A scrolling terraced landscape.
const causationBase: SynthSettings = {
  oscEngine: "noise",
  oscWave: 0.5, // noise color: <0.34 brown, <0.67 pink, else white
  oscTimbre: 0.5,
  octave: 0, // non-pitched engine — kept for shape only

  filterType: "bandpass",
  filterCutoff: 1400,
  filterResonance: 2.0,
  filterEnvAmount: 0.45,

  attack: 0.04,
  decay: 0.3,
  sustain: 0.6,
  release: 0.9,

  lfoShape: "sine",
  lfoRate: 0.5,
  lfoAmount: 0.12,

  cycEnvRate: 0.6,
  cycEnvAmount: 0.0,

  glide: 0.0,

  delayTime: 0.3,
  delayFeedback: 0.35,
  delayWet: 0.18,
  reverbWet: 0.4,

  // NoiseSynth reads much louder than the pitched engines even behind the
  // limiter — start well below the ~-9/-10 pitched presets.
  masterVolume: -17,
  visualReactivity: 0.7,
};

const causationPreset: ThemePreset = {
  id: "causation",
  label: "Causation",
  blurb: "Every cause has its effect; every effect its cause.",
  fragment: causationFragment,
  baseSettings: causationBase,
  shaderMacros: [0.5, 0.4, 0.35, 0.4],
};

// ── Gender ───────────────────────────────────────────────────────────────────
// "Gender is in everything." Bright, resonant analog lead — sharp, acid.
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

  masterVolume: -10,
  visualReactivity: 0.9,
};

const genderPreset: ThemePreset = {
  id: "gender",
  label: "Gender",
  blurb: "Gender is in everything; all things have two principles.",
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

export const DEFAULT_THEME: ThemeId = "mind";

/** The full SynthSettings for a theme — just the base voice, no macro layer. */
export function resolveSettings(theme: ThemeId): SynthSettings {
  return THEME_PRESETS[theme].baseSettings;
}

/** The fixed shader `uMacros` vec4 for a theme. */
export function shaderMacrosFor(theme: ThemeId): MacroValues {
  return THEME_PRESETS[theme].shaderMacros;
}
