"use client";

import { useResolvedSynthSettings, useSynthTweakStore } from "@/lib/store";
import type { SynthOverrideKey } from "@/lib/store";
import { FADERS, clamp01 } from "@/lib/synthFaders";

/**
 * The panel's four vertical faders. They edit the tweak store's overrides —
 * absolute values layered over the active preset — so a slider you've touched
 * holds its position across preset switches, and one you haven't tracks the
 * preset. Double-click hands a fader back to the preset.
 *
 * The faders themselves (what each one drives, and how its position maps to
 * settings) live in lib/synthFaders — the background render loop reads the
 * same table to let each fader re-tune the active shader.
 */

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
        <div className="absolute inset-y-0 left-1/2 w-4 -translate-x-1/2 rounded-xs bg-black/40" />
        <div
          className="absolute bottom-0 left-1/2 w-4 -translate-x-1/2 rounded-xs bg-white"
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
