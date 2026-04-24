"use client";

import { useEffect, useRef } from "react";
import { useSynthStore, useUIStore, type SynthSettings } from "@/lib/store";
import { useAudio } from "@/components/audio/AudioProvider";

type NumericKey = Exclude<keyof SynthSettings, "oscillatorType">;

type Control = {
  key: NumericKey;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
};

const CONTROLS: Control[] = [
  { key: "attack", label: "Attack", min: 0.001, max: 2, step: 0.01, unit: "s" },
  { key: "decay", label: "Decay", min: 0.01, max: 2, step: 0.01, unit: "s" },
  { key: "sustain", label: "Sustain", min: 0, max: 1, step: 0.01 },
  { key: "release", label: "Release", min: 0.01, max: 4, step: 0.01, unit: "s" },
  { key: "filterCutoff", label: "Cutoff", min: 80, max: 8000, step: 10, unit: "Hz" },
  { key: "filterResonance", label: "Resonance", min: 0, max: 10, step: 0.1 },
  { key: "delayWet", label: "Delay", min: 0, max: 1, step: 0.01 },
  { key: "delayTime", label: "Delay Time", min: 0, max: 1, step: 0.01, unit: "s" },
  { key: "delayFeedback", label: "Feedback", min: 0, max: 0.9, step: 0.01 },
  { key: "reverbWet", label: "Reverb", min: 0, max: 1, step: 0.01 },
  { key: "masterVolume", label: "Volume", min: -40, max: 0, step: 0.5, unit: "dB" },
  { key: "visualReactivity", label: "Reactivity", min: 0, max: 1, step: 0.01 },
];

export function SynthPanel() {
  const open = useUIStore((s) => s.synthPanelOpen);
  const setOpen = useUIStore((s) => s.setSynthPanel);
  const settings = useSynthStore((s) => s.settings);
  const set = useSynthStore((s) => s.set);
  const reset = useSynthStore((s) => s.reset);
  const { unlocked, unlock } = useAudio();

  const rootRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (open) firstFieldRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <aside
      ref={rootRef}
      role="dialog"
      aria-label="Synth controls"
      className="fixed bottom-4 right-4 z-40 w-[min(420px,calc(100vw-2rem))] rounded-xl border border-white/10 bg-black/80 p-5 font-mono text-xs text-white shadow-2xl backdrop-blur-md"
    >
      <header className="flex items-center justify-between">
        <div className="uppercase tracking-widest text-white/60">
          Synth
        </div>
        <div className="flex items-center gap-2">
          {!unlocked ? (
            <button
              onClick={() => unlock()}
              className="rounded border border-accent bg-accent/10 px-2 py-1 text-accent hover:bg-accent/20"
            >
              Enable audio
            </button>
          ) : null}
          <button
            onClick={reset}
            className="rounded border border-white/15 bg-white/5 px-2 py-1 hover:bg-white/10"
          >
            Reset
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded border border-white/15 bg-white/5 px-2 py-1 hover:bg-white/10"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <label className="col-span-2 flex items-center justify-between gap-3">
          <span className="uppercase tracking-widest text-white/60">
            Oscillator
          </span>
          <select
            ref={firstFieldRef}
            value={settings.oscillatorType}
            onChange={(e) =>
              set(
                "oscillatorType",
                e.target.value as SynthSettings["oscillatorType"],
              )
            }
            className="rounded border border-white/15 bg-black px-2 py-1"
          >
            <option value="sine">Sine</option>
            <option value="triangle">Triangle</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="square">Square</option>
          </select>
        </label>

        {CONTROLS.map((c) => (
          <label key={c.key} className="flex flex-col gap-1">
            <span className="flex items-center justify-between">
              <span className="uppercase tracking-widest text-white/60">
                {c.label}
              </span>
              <span className="tabular-nums text-white/80">
                {formatValue(settings[c.key], c.unit)}
              </span>
            </span>
            <input
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={settings[c.key]}
              onChange={(e) => set(c.key, Number(e.target.value))}
              className="accent-accent"
            />
          </label>
        ))}
      </div>

      <footer className="mt-4 text-white/60">
        Home row plays notes · Shift = +1 oct · Alt = −1 oct · Esc closes
      </footer>
    </aside>
  );
}

function formatValue(v: number, unit?: string) {
  const formatted =
    Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toFixed(3);
  return unit ? `${formatted} ${unit}` : formatted;
}
