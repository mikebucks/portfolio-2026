import type { SynthOverrideKey } from "@/lib/store";
import type { SynthSettings } from "@/lib/synthTypes";

/**
 * The panel's faders as data, shared with the background render loop.
 * Only parameters audible on every engine. A fader is a macro: delay drives
 * wet and feedback together. Wet caps keep the dry signal from crossfading away.
 */

/** Fader order matches the shader's `uSynth.xyzw`. */
export type FaderId = "volume" | "cutoff" | "reverb" | "delay";

export type Fader = {
  id: FaderId;
  label: string;
  /** Every override this fader writes; double-click clears them all. */
  keys: SynthOverrideKey[];
  /** Fader position for the current (merged) settings, 0..1. */
  getT: (s: SynthSettings) => number;
  /** The overrides to write for a fader position. */
  apply: (t: number) => Partial<Record<SynthOverrideKey, number>>;
  format: (s: SynthSettings) => string;
};

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

// Runs past 0: the master limiter (-1 dB) catches the peaks.
const VOL_MIN = -36;
const VOL_MAX = 6;
const VOL_RANGE = VOL_MAX - VOL_MIN;

const CUT_MIN = 80;
const CUT_MAX = 12000;
const CUT_RATIO = CUT_MAX / CUT_MIN;

const REV_WET_MAX = 0.85;

const DLY_WET_MAX = 0.5;
const DLY_FB_MIN = 0.1;
const DLY_FB_MAX = 0.7; // clear of runaway

const pct = (t: number) => `${Math.round(t * 100)}%`;

export const FADERS: Fader[] = [
  {
    id: "volume",
    label: "volume",
    keys: ["masterVolume"],
    getT: (s) => clamp01((s.masterVolume - VOL_MIN) / VOL_RANGE),
    apply: (t) => ({ masterVolume: VOL_MIN + t * VOL_RANGE }),
    format: (s) => `${Math.round(s.masterVolume)}dB`,
  },
  {
    id: "cutoff",
    label: "cutoff",
    keys: ["filterCutoff"],
    getT: (s) => clamp01(Math.log(s.filterCutoff / CUT_MIN) / Math.log(CUT_RATIO)),
    apply: (t) => ({ filterCutoff: Math.round(CUT_MIN * Math.pow(CUT_RATIO, t)) }),
    format: (s) =>
      s.filterCutoff >= 1000
        ? `${(s.filterCutoff / 1000).toFixed(1)}k`
        : `${Math.round(s.filterCutoff)}`,
  },
  {
    id: "reverb",
    label: "reverb",
    keys: ["reverbWet"],
    getT: (s) => clamp01(s.reverbWet / REV_WET_MAX),
    apply: (t) => ({ reverbWet: t * REV_WET_MAX }),
    format: (s) => pct(clamp01(s.reverbWet / REV_WET_MAX)),
  },
  {
    id: "delay",
    label: "delay",
    keys: ["delayWet", "delayFeedback"],
    getT: (s) => clamp01(s.delayWet / DLY_WET_MAX),
    apply: (t) => ({
      delayWet: t * DLY_WET_MAX,
      delayFeedback: DLY_FB_MIN + t * (DLY_FB_MAX - DLY_FB_MIN),
    }),
    format: (s) => pct(clamp01(s.delayWet / DLY_WET_MAX)),
  },
];

/**
 * Fader offset from the preset, normalised per side: -1 bottom, 0 preset,
 * +1 top. A raw `t - tPreset` would starve one direction for most presets.
 */
export function faderDelta(t: number, tPreset: number): number {
  const d = t - tPreset;
  // The guards only matter when the numerator is already 0.
  return d < 0 ? d / Math.max(tPreset, 1e-6) : d / Math.max(1 - tPreset, 1e-6);
}
