"use client";

import { useState } from "react";
import { useResolvedSynthSettings, useSynthTweakStore } from "@/lib/store";
import type { SynthOverrideKey } from "@/lib/store";
import { FADERS, clamp01 } from "@/lib/synthFaders";

/**
 * Four vertical faders editing the tweak store's overrides over the active
 * preset. Double-click resets one. Definitions live in lib/synthFaders.
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
  // Fill height eases when the value arrives from elsewhere, never mid-drag.
  const [dragging, setDragging] = useState(false);

  const fromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onChange(clamp01(1 - (e.clientY - r.top) / r.height));
  };

  const strip = "absolute left-1/2 -translate-x-1/2 rounded-xs";

  return (
    <div className="group flex flex-col items-center gap-1.5">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(t * 100)}
        aria-valuetext={display}
        data-dragging={dragging}
        title="Drag up or down · double-click to reset to the preset"
        // Capture keeps a drag tracking outside the strip; the buttons guard
        // skips hover moves.
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          fromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons & 1) fromPointer(e);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onLostPointerCapture={() => setDragging(false)}
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
        // `peer` lets the sibling label follow the same states.
        className="group peer relative h-24 w-10 cursor-ns-resize touch-none outline-none"
      >
        <div className={`${strip} inset-y-0 w-4 bg-black/40`} />
        <div
          className={`${strip} bottom-0 w-4 bg-white group-hover:w-5 group-focus-visible:w-5 group-data-[dragging=true]:w-5 ${
            dragging
              ? "transition-[width] duration-200"
              : "transition-[width,height] duration-300 ease-out"
          }`}
          style={{ height: `${t * 100}%` }}
        />
      </div>
      <div className="text-[10px] uppercase tracking-wider text-white/60 transition-colors duration-200 peer-hover:text-white peer-focus-visible:text-white peer-data-[dragging=true]:text-white">
        {label}
      </div>
    </div>
  );
}
