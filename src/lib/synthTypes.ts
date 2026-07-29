/**
 * Synth-engine types. Lives in its own module so theme presets can import the
 * types without creating a cycle through `store.ts` (which itself depends on
 * the theme list).
 */

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
  oscEngine: OscEngine;
  oscWave: number;
  oscTimbre: number;

  /**
   * Octave transpose applied to every note before it reaches the voice. The
   * keyboard mapping is one fixed handpan layout shared by all themes, so a
   * preset that needs to sit in a different register — a bass, say — shifts it
   * here rather than the mapping being rewritten per theme.
   */
  octave: number;

  filterType: FilterType;
  filterCutoff: number;
  filterResonance: number;
  filterEnvAmount: number;

  attack: number;
  decay: number;
  sustain: number;
  release: number;

  lfoShape: LfoShape;
  lfoRate: number;
  lfoAmount: number;

  cycEnvRate: number;
  cycEnvAmount: number;

  glide: number;

  delayTime: number;
  delayFeedback: number;
  delayWet: number;
  reverbWet: number;

  masterVolume: number;
  visualReactivity: number;
};

/** A 4-tuple of 0..1 values — a theme's fixed shader `uMacros` vec4. */
export type MacroValues = [number, number, number, number];
