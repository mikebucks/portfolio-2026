import type { MacroValues, SynthSettings } from "@/lib/synthTypes";
import { auroraFragment } from "./aurora";
import { cellularFragment } from "./cellular";
import { emberFragment } from "./ember";
import { pulseFragment } from "./pulse";
import { tideFragment } from "./tide";

export type ThemeId =
  | "cellular"
  | "aurora"
  | "tide"
  | "ember"
  | "pulse"
  | "static"
  | "neon";

/**
 * One macro = one slider on the panel and one component of `uMacros` in the
 * shader. The `apply` function transforms a 0..1 value into synth-parameter
 * deltas; multiple macros can touch the same parameter — the resolver runs
 * them in order, so later macros overwrite or stack on earlier ones.
 */
export type Macro = {
  label: string;
  hint: string;
  default: number;
  apply: (v: number, base: SynthSettings) => SynthSettings;
};

export type ThemePreset = {
  id: ThemeId;
  label: string;
  blurb: string;
  fragment: string;
  baseSettings: SynthSettings;
  macros: [Macro, Macro, Macro, Macro];
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ── Cellular ────────────────────────────────────────────────────────────────
// Calm crystalline pad — additive harmonics through a slow filter.
const cellularBase: SynthSettings = {
  oscEngine: "harmonic",
  oscWave: 0.55,
  oscTimbre: 0.30,

  filterType: "lowpass",
  filterCutoff: 1800,
  filterResonance: 0.8,
  filterEnvAmount: 0.30,

  attack: 0.18,
  decay: 0.45,
  sustain: 0.65,
  release: 1.4,

  lfoShape: "sine",
  lfoRate: 0.6,
  lfoAmount: 0.05,

  cycEnvRate: 0.4,
  cycEnvAmount: 0.0,

  glide: 0.0,

  delayTime: 0.32,
  delayFeedback: 0.30,
  delayWet: 0.18,
  reverbWet: 0.35,

  masterVolume: -10,
  visualReactivity: 0.7,
};

const cellularPreset: ThemePreset = {
  id: "cellular",
  label: "Cellular",
  blurb: "Crystalline pad through a soft filter",
  fragment: cellularFragment,
  baseSettings: cellularBase,
  macros: [
    {
      label: "Glow",
      hint: "Opens the filter and adds reverb",
      default: 0.45,
      apply: (v, s) => ({
        ...s,
        filterCutoff: lerp(700, 6500, v),
        reverbWet: lerp(0.12, 0.65, v),
        masterVolume: lerp(-12, -7, v),
      }),
    },
    {
      label: "Bloom",
      hint: "Resonant ring + sharper cells",
      default: 0.30,
      apply: (v, s) => ({
        ...s,
        filterResonance: lerp(0.4, 4.5, v),
        filterEnvAmount: lerp(0.15, 0.85, v),
      }),
    },
    {
      label: "Drift",
      hint: "Slow modulation that drifts the timbre",
      default: 0.25,
      apply: (v, s) => ({
        ...s,
        lfoRate: lerp(0.25, 3.5, v),
        lfoAmount: lerp(0.03, 0.35, v),
        cycEnvRate: lerp(0.3, 2.0, v),
        cycEnvAmount: lerp(0.0, 0.4, v),
      }),
    },
    {
      label: "Echo",
      hint: "Trailing delay tail",
      default: 0.35,
      apply: (v, s) => ({
        ...s,
        delayWet: lerp(0.05, 0.55, v),
        delayFeedback: lerp(0.18, 0.62, v),
      }),
    },
  ],
};

// ── Aurora ──────────────────────────────────────────────────────────────────
// Lush stacked-saw pad — wide, shimmering, classic ambient.
const auroraBase: SynthSettings = {
  oscEngine: "super",
  oscWave: 0.55,
  oscTimbre: 0.45,

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

const auroraPreset: ThemePreset = {
  id: "aurora",
  label: "Aurora",
  blurb: "Stacked saws drifting under reverb",
  fragment: auroraFragment,
  baseSettings: auroraBase,
  macros: [
    {
      label: "Air",
      hint: "Brightens and adds space",
      default: 0.55,
      apply: (v, s) => ({
        ...s,
        filterCutoff: lerp(1100, 7200, v),
        reverbWet: lerp(0.20, 0.75, v),
      }),
    },
    {
      label: "Shimmer",
      hint: "More saws, wider spread",
      default: 0.45,
      apply: (v, s) => ({
        ...s,
        oscWave: lerp(0.25, 1.0, v),
        oscTimbre: lerp(0.20, 1.0, v),
      }),
    },
    {
      label: "Sway",
      hint: "Pitched sway from the LFO",
      default: 0.30,
      apply: (v, s) => ({
        ...s,
        lfoRate: lerp(0.4, 4.5, v),
        lfoAmount: lerp(0.04, 0.32, v),
      }),
    },
    {
      label: "Tail",
      hint: "Delay length and feedback",
      default: 0.40,
      apply: (v, s) => ({
        ...s,
        delayWet: lerp(0.08, 0.60, v),
        delayFeedback: lerp(0.22, 0.62, v),
      }),
    },
  ],
};

// ── Tide ────────────────────────────────────────────────────────────────────
// Plucked Karplus strings — long resonant tail, watery delay.
const tideBase: SynthSettings = {
  oscEngine: "karplus",
  oscWave: 0.7,
  oscTimbre: 0.4,

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

const tidePreset: ThemePreset = {
  id: "tide",
  label: "Tide",
  blurb: "Plucked strings pooling under deep reverb",
  fragment: tideFragment,
  baseSettings: tideBase,
  macros: [
    {
      label: "Depth",
      hint: "Darker tone, longer reverb",
      default: 0.45,
      apply: (v, s) => ({
        ...s,
        filterCutoff: lerp(4500, 1400, v),
        reverbWet: lerp(0.25, 0.80, v),
      }),
    },
    {
      label: "Splash",
      hint: "More attack noise on each pluck",
      default: 0.40,
      apply: (v, s) => ({
        ...s,
        oscTimbre: lerp(0.10, 0.95, v),
      }),
    },
    {
      label: "Current",
      hint: "Glide between notes + delay length",
      default: 0.35,
      apply: (v, s) => ({
        ...s,
        glide: lerp(0.0, 0.20, v),
        delayTime: lerp(0.18, 0.55, v),
      }),
    },
    {
      label: "Foam",
      hint: "Brighter, more shimmering tone",
      default: 0.40,
      apply: (v, s) => ({
        ...s,
        oscWave: lerp(0.30, 0.95, v),
        filterResonance: lerp(0.4, 2.2, v),
      }),
    },
  ],
};

// ── Ember ───────────────────────────────────────────────────────────────────
// Two-op FM — bell / metallic warmth, swelling cycling envelope.
const emberBase: SynthSettings = {
  oscEngine: "fm",
  oscWave: 0.45,
  oscTimbre: 0.35,

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

const emberPreset: ThemePreset = {
  id: "ember",
  label: "Ember",
  blurb: "FM bells crackling in warm haze",
  fragment: emberFragment,
  baseSettings: emberBase,
  macros: [
    {
      label: "Heat",
      hint: "Brighter tone, more harmonic content",
      default: 0.50,
      apply: (v, s) => ({
        ...s,
        oscWave: lerp(0.15, 0.95, v),
        filterCutoff: lerp(1400, 5500, v),
      }),
    },
    {
      label: "Spark",
      hint: "Cycling resonance — adds chaos",
      default: 0.30,
      apply: (v, s) => ({
        ...s,
        cycEnvRate: lerp(0.5, 5.0, v),
        cycEnvAmount: lerp(0.0, 0.55, v),
      }),
    },
    {
      label: "Crackle",
      hint: "Tighter envelope — short, plucky bursts",
      default: 0.40,
      apply: (v, s) => ({
        ...s,
        attack: lerp(0.20, 0.005, v),
        decay: lerp(0.6, 0.18, v),
        sustain: lerp(0.7, 0.15, v),
      }),
    },
    {
      label: "Smoke",
      hint: "Hazy reverb tail",
      default: 0.45,
      apply: (v, s) => ({
        ...s,
        reverbWet: lerp(0.15, 0.70, v),
        release: lerp(0.5, 2.4, v),
      }),
    },
  ],
};

// ── Pulse ───────────────────────────────────────────────────────────────────
// Pulse-wave analog — punchy, rhythmic, low-fi techno.
const pulseBase: SynthSettings = {
  oscEngine: "analog",
  oscWave: 0.5,
  oscTimbre: 0.3,

  filterType: "lowpass",
  filterCutoff: 1800,
  filterResonance: 1.2,
  filterEnvAmount: 0.55,

  attack: 0.005,
  decay: 0.18,
  sustain: 0.45,
  release: 0.4,

  lfoShape: "triangle",
  lfoRate: 4.0,
  lfoAmount: 0.10,

  cycEnvRate: 1.0,
  cycEnvAmount: 0.0,

  glide: 0.0,

  delayTime: 0.22,
  delayFeedback: 0.40,
  delayWet: 0.20,
  reverbWet: 0.20,

  masterVolume: -9,
  visualReactivity: 0.85,
};

const pulsePreset: ThemePreset = {
  id: "pulse",
  label: "Pulse",
  blurb: "Punchy pulse wave on a ticking grid",
  fragment: pulseFragment,
  baseSettings: pulseBase,
  macros: [
    {
      label: "Width",
      hint: "Pulse width — thin to fat",
      default: 0.40,
      apply: (v, s) => ({
        ...s,
        oscWave: lerp(0.10, 0.95, v),
      }),
    },
    {
      label: "Drive",
      hint: "Resonant edge with envelope sweep",
      default: 0.45,
      apply: (v, s) => ({
        ...s,
        filterResonance: lerp(0.5, 5.5, v),
        filterEnvAmount: lerp(0.20, 0.95, v),
      }),
    },
    {
      label: "Wobble",
      hint: "Filter wobble from the LFO",
      default: 0.30,
      apply: (v, s) => ({
        ...s,
        lfoRate: lerp(1.0, 7.5, v),
        lfoAmount: lerp(0.04, 0.30, v),
      }),
    },
    {
      label: "Boom",
      hint: "Lifts low-end and adds reverb",
      default: 0.40,
      apply: (v, s) => ({
        ...s,
        filterCutoff: lerp(900, 4200, v),
        reverbWet: lerp(0.10, 0.55, v),
      }),
    },
  ],
};

// ── Static ──────────────────────────────────────────────────────────────────
// Filtered noise — wind / surf / granular texture through the shared filter.
// The one non-pitched engine: the keyboard gives rhythmic control, macros
// shape color and motion.
const staticBase: SynthSettings = {
  oscEngine: "noise",
  oscWave: 0.5, // noise color: <0.34 brown, <0.67 pink, else white
  oscTimbre: 0.5,

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
  // limiter — start well below the ~-9/-10 pitched presets and keep the
  // "Space" macro from pushing it up.
  masterVolume: -17,
  visualReactivity: 0.7,
};

const staticPreset: ThemePreset = {
  id: "static",
  label: "Static",
  blurb: "Filtered noise — wind through a resonant band",
  fragment: cellularFragment,
  baseSettings: staticBase,
  macros: [
    {
      label: "Grain",
      hint: "Noise color — dark surf to bright hiss",
      default: 0.5,
      apply: (v, s) => ({
        ...s,
        oscWave: v,
      }),
    },
    {
      label: "Sweep",
      hint: "Filter band position + envelope sweep",
      default: 0.4,
      apply: (v, s) => ({
        ...s,
        filterCutoff: lerp(400, 6000, v),
        filterEnvAmount: lerp(0.15, 0.8, v),
      }),
    },
    {
      label: "Motion",
      hint: "LFO rate + depth — the wind picks up",
      default: 0.35,
      apply: (v, s) => ({
        ...s,
        lfoRate: lerp(0.2, 4.0, v),
        lfoAmount: lerp(0.05, 0.4, v),
      }),
    },
    {
      label: "Space",
      hint: "Reverb + delay wash",
      default: 0.4,
      apply: (v, s) => ({
        ...s,
        reverbWet: lerp(0.2, 0.75, v),
        delayWet: lerp(0.08, 0.5, v),
      }),
    },
  ],
};

// ── Neon ────────────────────────────────────────────────────────────────────
// Bright resonant analog lead — sharper, more acid than Pulse's punchy techno.
const neonBase: SynthSettings = {
  oscEngine: "analog",
  oscWave: 0.7,
  oscTimbre: 0.5,

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

const neonPreset: ThemePreset = {
  id: "neon",
  label: "Neon",
  blurb: "Acid analog lead cutting through delay",
  fragment: pulseFragment,
  baseSettings: neonBase,
  macros: [
    {
      label: "Cut",
      hint: "Filter cutoff — how bright the lead sits",
      default: 0.5,
      apply: (v, s) => ({
        ...s,
        filterCutoff: lerp(700, 6500, v),
      }),
    },
    {
      label: "Bite",
      hint: "Resonance + envelope sweep — squelch",
      default: 0.5,
      apply: (v, s) => ({
        ...s,
        filterResonance: lerp(1.0, 7.0, v),
        filterEnvAmount: lerp(0.3, 1.0, v),
      }),
    },
    {
      label: "Slide",
      hint: "Portamento glide + pulse width",
      default: 0.35,
      apply: (v, s) => ({
        ...s,
        glide: lerp(0.0, 0.18, v),
        oscWave: lerp(0.25, 0.95, v),
      }),
    },
    {
      label: "Echo",
      hint: "Delay feedback + reverb",
      default: 0.4,
      apply: (v, s) => ({
        ...s,
        delayWet: lerp(0.1, 0.55, v),
        delayFeedback: lerp(0.25, 0.65, v),
        reverbWet: lerp(0.1, 0.45, v),
      }),
    },
  ],
};

export const THEME_PRESETS: Record<ThemeId, ThemePreset> = {
  cellular: cellularPreset,
  aurora: auroraPreset,
  tide: tidePreset,
  ember: emberPreset,
  pulse: pulsePreset,
  static: staticPreset,
  neon: neonPreset,
};

export const THEME_IDS: readonly ThemeId[] = [
  "cellular",
  "aurora",
  "tide",
  "ember",
  "pulse",
  "static",
  "neon",
] as const;

export const DEFAULT_THEME: ThemeId = "cellular";

/** Resolve macro values for a given theme into a full SynthSettings. */
export function resolveSettings(
  theme: ThemeId,
  macros: MacroValues,
): SynthSettings {
  const preset = THEME_PRESETS[theme];
  let s = preset.baseSettings;
  for (let i = 0; i < 4; i++) {
    s = preset.macros[i].apply(macros[i], s);
  }
  return s;
}

export function defaultMacrosFor(theme: ThemeId): MacroValues {
  const m = THEME_PRESETS[theme].macros;
  return [m[0].default, m[1].default, m[2].default, m[3].default];
}
