/** Own module so theme presets can import types without a cycle through store.ts. */

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

  /** Octave transpose; the keyboard mapping is fixed, so presets shift register here. */
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
