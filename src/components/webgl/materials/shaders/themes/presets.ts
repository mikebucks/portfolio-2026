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
// "The All is Mind." Dream bells: FM tuned a hair *off* the harmonic series —
// harmonicity 2.98 instead of 3 — so the carrier and modulator partials beat
// slowly against each other and every note shimmers like two thoughts
// interfering. Struck-bell envelope (instant attack, long singing decay, a
// whisper of sustain) an octave up in a crystalline register; the strike
// blooms the filter open and a glacial cycling envelope keeps the tail's
// resonance breathing long after the attack, so held chords evolve instead of
// just fading. Long feedback echoes let each note answer itself into the
// reverb. Polarity keeps the warm sustained-pad reading of FM; this is the
// other pole of the same engine.
const mindBase: SynthSettings = {
  oscEngine: "fm",
  // Low modulation index (≈4.5): glass, not clangor. The engine's fixed
  // modulation envelope then drops the index to a third within 200ms, so the
  // strike sparkles and the tail rings pure.
  oscWave: 0.22,
  oscTimbre: 0.62, // harmonicity 2.98 — the near-miss that makes the shimmer

  // One octave up: the ding lands on D4. High enough to read as chimes, low
  // enough that the octave-down shift still has somewhere to go.
  octave: 1,

  filterType: "lowpass",
  filterCutoff: 3800,
  filterResonance: 1.6,
  filterEnvAmount: 0.35, // strike opens ~+1.9kHz, then falls with the decay

  attack: 0.002,
  decay: 0.9,
  sustain: 0.12, // a held key fades to a whisper — bells, not organ
  release: 2.2, // lifts slowly into the reverb rather than stopping

  // Very slow drift, wide enough (±330Hz) to hear the space "think".
  lfoShape: "sine",
  lfoRate: 0.3,
  lfoAmount: 0.14,

  // Resonance crawls ±1.8 over ~6s — the evolving tail. Deliberately far from
  // the LFO's rate so the two never settle into a pattern.
  cycEnvRate: 0.18,
  cycEnvAmount: 0.3,

  glide: 0.0,

  // Each note echoes back at itself: long repeats, audible cascade.
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

  masterVolume: -4,
  visualReactivity: 0.8,
};

const polarityPreset: ThemePreset = {
  id: "polarity",
  label: "Polarity",
  blurb: "Everything is dual; everything has poles; everything hadd its pair of opposites; like and unlike are the same; opposites are identical in nature, but different in deggree; extremes meet; all truths are but half-truths; all pardoxxes may be reconciled.",
  fragment: polarityFragment,
  baseSettings: polarityBase,
  // Scale / Flow / Spiral / Bloom. Spiral is kept low on purpose: in unison the
  // wavefront is one of the torus's own parallels and the form is unmistakable,
  // and it takes very little stagger to lose that.
  shaderMacros: [0.5, 0.45, 0.22, 0.45],
};

// ── Rhythm ───────────────────────────────────────────────────────────────────
// "All things rise and fall." A rack of pendulum bobs swings in perfect unison
// while a wave travels up and down the row. Plucked Karplus strings — short,
// staccato tail, watery delay — so each key reads as a bob struck. Notes drive
// the swing.
//
// Loudness lives in the excitation here, not the tail: PluckSynth feeds its
// string a burst of noise per strike (attackNoise × the note's period), so
// timbre is the throttle on how hard the bob is hit. Kept the resonance
// (oscWave) where it was so the pluck stays a pluck — the decay is the
// character, it just needed to arrive with more weight. (Strike-to-strike
// consistency comes from the engine's subsonic trap, not from the burst.)
const rhythmBase: SynthSettings = {
  oscEngine: "karplus",
  oscWave: 0.7,
  oscTimbre: 0.6, // ≈3.7 periods of noise — a harder strike, same decay

  octave: 0,

  // The pluck's bite is its loudness; the old 3.2 kHz corner (with the master
  // EQ's high shelf behind it) was trimming exactly that.
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

  // Measured at the master against the other presets (60 Hz–12 kHz band,
  // five strikes each): -1 sits the pluck level with Gender and Cause & Effect.
  masterVolume: -1,
  visualReactivity: 0.8,
};

const rhythmPreset: ThemePreset = {
  id: "rhythm",
  label: "Rhythm",
  blurb: "Everything flows, out and in; everything has its tides; all things rise and fall; the pendulum-swing manifests in everything; the measure of the swing to the right is the measure of the swing to the left; rhythm compensates.",
  fragment: rhythmFragment,
  baseSettings: rhythmBase,
  // x Swing · y Wave · z Tempo · w Glow — see rhythm.ts header.
  shaderMacros: [0.5, 0.55, 0.45, 0.55],
};

// ── Causation · Cause & Effect ───────────────────────────────────────────────
// "Every cause has its effect." A drawbar organ with an EDM edge: the additive
// engine stacks harmonic partials like drawbars (rich, smooth, speaks
// instantly, sustains at full weight), while a resonant filter with a short
// envelope pluck and a fast shimmer LFO puts a synthetic bite on the front of
// every note. An undulating grid of circles.
const causationBase: SynthSettings = {
  // Additive partial stack — the organ. Brightness up so the upper drawbars
  // are actually out; timbre low keeps the even harmonics in the stack, which
  // is where the fullness lives (high timbre thins it to odd-only, clarinet
  // territory).
  oscEngine: "harmonic",
  oscWave: 0.62,
  oscTimbre: 0.25,
  octave: 0,

  // The EDM edge lives here, not in the oscillator: moderate resonance and a
  // filter envelope that snaps open ~1.6kHz above the corner on each strike,
  // then settles. Reads as a squelchy pluck on the front of an otherwise
  // smooth held tone.
  filterType: "lowpass",
  filterCutoff: 2000,
  filterResonance: 2.2,
  filterEnvAmount: 0.3,

  // Organ articulation: speaks the moment the key goes down, holds at nearly
  // full level for as long as it's held, gets out of the way quickly on
  // release so runs stay clean.
  attack: 0.012,
  decay: 0.18,
  sustain: 0.85,
  release: 0.5,

  // Fast, shallow cutoff shimmer — the rotary-speaker flutter that keeps a
  // held chord alive.
  lfoShape: "sine",
  lfoRate: 5.6,
  lfoAmount: 0.05,

  // Slow resonance swell underneath, out of step with the LFO so the two
  // never settle into an audible pattern.
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
  // x Glow · y Density · z Drift · w Echo — see causation.ts header.
  shaderMacros: [0.4, 0.45, 0.4, 0.5],
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

/** The full SynthSettings for a theme — just the base voice, no macro layer. */
export function resolveSettings(theme: ThemeId): SynthSettings {
  return THEME_PRESETS[theme].baseSettings;
}

/** The fixed shader `uMacros` vec4 for a theme. */
export function shaderMacrosFor(theme: ThemeId): MacroValues {
  return THEME_PRESETS[theme].shaderMacros;
}
