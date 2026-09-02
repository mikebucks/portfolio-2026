import type { SynthOverrideKey } from "@/lib/store";
import type { SynthSettings } from "@/lib/synthTypes";

/**
 * The synth panel's four faders, as data. Shared by the panel (which draws
 * and edits them) and the background render loop (which reads each fader's
 * position to parametrize the active shader), so the two can never disagree
 * about where a fader sits.
 *
 * The set is deliberately the parameters that are audible on *every* engine:
 * volume and the wet sends live on the master chain, and every voice runs
 * through the shared filter. Preset-specific character (envelopes, LFOs,
 * timbre) stays the preset's own.
 *
 * A fader is a macro, not necessarily one parameter. Delay is the example:
 * wet alone reads as "the note arrives late" once it crosses the dry signal
 * (and the preset's low feedback gives a single repeat), so the knob drives
 * wet — capped at an equal blend, the played note always speaks on time —
 * and feedback together: further up, more repeats, longer fade. Pedal logic.
 *
 * The wet caps stop the top of a send fader from crossfading the dry signal
 * away entirely — full-wet is a synthesis trick, not what a mix knob means.
 */

/** Fader order — matches the shader's `uSynth.xyzw`. */
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

// The presets sit a few dB under 0 so a chord has headroom, but the fader
// runs past 0: the master limiter (-1 dB) catches the peaks, so the top of the
// travel reads as "louder and denser" rather than clipping.
const VOL_MIN = -36;
const VOL_MAX = 6;
const VOL_RANGE = VOL_MAX - VOL_MIN;

const CUT_MIN = 80;
const CUT_MAX = 12000;
const CUT_RATIO = CUT_MAX / CUT_MIN;

const REV_WET_MAX = 0.85;

const DLY_WET_MAX = 0.5;
const DLY_FB_MIN = 0.1;
const DLY_FB_MAX = 0.7; // well clear of runaway; ~10 audible repeats at the top

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
 * Signed offset of a fader from the preset's own position, normalised per
 * side: -1 at the fader's bottom, 0 at the preset, +1 at the top.
 *
 * Presets sit at very different points of each fader's travel (Rhythm's
 * cutoff at ~0.74, Vibration's reverb at ~0.04), so a raw `t - tPreset` would
 * hand a shader almost no range in one direction. Normalising each side gives
 * every shader a clean -1..1 to design against, whatever the preset — and 0
 * still means "untouched", which is what keeps the resting look identical.
 */
export function faderDelta(t: number, tPreset: number): number {
  const d = t - tPreset;
  // The guards only matter when the numerator is already 0.
  return d < 0 ? d / Math.max(tPreset, 1e-6) : d / Math.max(1 - tPreset, 1e-6);
}
