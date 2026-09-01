"use client";

import { useResolvedSynthSettings, useSynthTweakStore } from "@/lib/store";
import type { SynthOverrideKey, SynthSettings } from "@/lib/store";

/**
 * The panel's four vertical faders. They edit the tweak store's overrides —
 * absolute values layered over the active preset — so a slider you've touched
 * holds its position across preset switches, and one you haven't tracks the
 * preset. Double-click hands a fader back to the preset.
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

type Fader = {
  label: string;
  /** Every override this fader writes; double-click clears them all. */
  keys: SynthOverrideKey[];
  /** Fader position for the current (merged) settings, 0..1. */
  getT: (s: SynthSettings) => number;
  /** The overrides to write for a fader position. */
  apply: (t: number) => Partial<Record<SynthOverrideKey, number>>;
  format: (s: SynthSettings) => string;
};

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

const CUT_MIN = 80;
const CUT_MAX = 12000;
const CUT_RATIO = CUT_MAX / CUT_MIN;

const REV_WET_MAX = 0.85;

const DLY_WET_MAX = 0.5;
const DLY_FB_MIN = 0.1;
const DLY_FB_MAX = 0.7; // well clear of runaway; ~10 audible repeats at the top

const pct = (t: number) => `${Math.round(t * 100)}%`;

const FADERS: Fader[] = [
  {
    label: "volume",
    keys: ["masterVolume"],
    getT: (s) => clamp01((s.masterVolume + 36) / 36),
    apply: (t) => ({ masterVolume: -36 + t * 36 }),
    format: (s) => `${Math.round(s.masterVolume)}dB`,
  },
  {
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
    label: "reverb",
    keys: ["reverbWet"],
    getT: (s) => clamp01(s.reverbWet / REV_WET_MAX),
    apply: (t) => ({ reverbWet: t * REV_WET_MAX }),
    format: (s) => pct(clamp01(s.reverbWet / REV_WET_MAX)),
  },
  {
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

export function SynthSliders() {
  const settings = useResolvedSynthSettings();
  const setOverride = useSynthTweakStore((s) => s.setOverride);

  return (
    <div className="grid grid-cols-4">
      {FADERS.map((f) => (
        <VSlider
          key={f.label}
          label={f.label}
          t={f.getT(settings)}
          display={f.format(settings)}
          onChange={(t) => {
            for (const [key, value] of Object.entries(f.apply(t))) {
              setOverride(key as SynthOverrideKey, value);
            }
          }}
          onReset={() => f.keys.forEach((key) => setOverride(key, null))}
        />
      ))}
    </div>
  );
}

function VSlider({
  label,
  t,
  display,
  onChange,
  onReset,
}: {
  label: string;
  /** Fader position, 0 (bottom) .. 1 (top). */
  t: number;
  /** Human-readable value — spoken by screen readers, not printed. */
  display: string;
  onChange: (t: number) => void;
  onReset: () => void;
}) {
  const fromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onChange(clamp01(1 - (e.clientY - r.top) / r.height));
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(t * 100)}
        aria-valuetext={display}
        title="Double-click to reset to the preset"
        // Pointer capture lets a drag keep tracking outside the strip; the
        // buttons guard skips plain hover moves.
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons & 1) fromPointer(e);
        }}
        onDoubleClick={onReset}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault();
            onChange(clamp01(t + 0.04));
          } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault();
            onChange(clamp01(t - 0.04));
          }
        }}
        className="relative h-24 w-10 cursor-pointer touch-none"
      >
        {/* Track and fill wear the octave buttons' clothes — same dark wash,
            same corner radius — so the panel's controls read as one family. */}
        <div className="absolute inset-y-0 left-1/2 w-2.5 -translate-x-1/2 rounded-xs bg-black/40" />
        <div
          className="absolute bottom-0 left-1/2 w-2.5 -translate-x-1/2 rounded-xs bg-white"
          style={{ height: `${t * 100}%` }}
        />
        {/* <div
          className="absolute left-1/2 h-2 w-4 -translate-x-1/2 translate-y-1/2 rounded-xs bg-white"
          style={{ bottom: `${t * 100}%` }}
        /> */}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-white/60">
        {label}
      </div>
    </div>
  );
}
