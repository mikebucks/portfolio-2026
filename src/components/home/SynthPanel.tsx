"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  useSynthStore,
  useUIStore,
  type FilterType,
  type LfoShape,
  type OscEngine,
} from "@/lib/store";
import { useAudio } from "@/components/audio/AudioProvider";

const ENGINES: { value: OscEngine; label: string; blurb: string }[] = [
  { value: "analog", label: "Analog", blurb: "Pulse / PWM" },
  { value: "super", label: "Super", blurb: "Stacked saws" },
  { value: "fm", label: "FM", blurb: "2-op modulation" },
  { value: "harmonic", label: "Harmonic", blurb: "Additive partials" },
  { value: "karplus", label: "Karplus", blurb: "Plucked string" },
  { value: "noise", label: "Noise", blurb: "Filtered hiss" },
];

const FILTER_TYPES: { value: FilterType; label: string }[] = [
  { value: "lowpass", label: "LP" },
  { value: "bandpass", label: "BP" },
  { value: "highpass", label: "HP" },
];

const LFO_SHAPES: { value: LfoShape; label: string }[] = [
  { value: "sine", label: "∿" },
  { value: "triangle", label: "△" },
  { value: "square", label: "▮" },
  { value: "sawtooth", label: "◢" },
];

export function SynthPanel() {
  const open = useUIStore((s) => s.synthPanelOpen);
  const setOpen = useUIStore((s) => s.setSynthPanel);
  const settings = useSynthStore((s) => s.settings);
  const set = useSynthStore((s) => s.set);
  const reset = useSynthStore((s) => s.reset);
  const { unlocked, unlock } = useAudio();

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
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
      className="fixed bottom-20 right-4 z-40 w-[min(560px,calc(100vw-2rem))] max-h-[calc(100vh-7rem)] overflow-y-auto rounded-xl border border-white/10 bg-black/85 p-4 font-mono text-xs text-white shadow-2xl backdrop-blur-md"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            Hybrid Synth
          </span>
          <span className="text-[10px] tabular-nums text-white/30">v2</span>
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
            Init
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded border border-white/15 bg-white/5 px-2 py-1 hover:bg-white/10"
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Module title="Osc" hue="#f59e0b" className="sm:col-span-2">
          <EngineSelector
            value={settings.oscEngine}
            onChange={(v) => set("oscEngine", v)}
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Knob
              label="Wave"
              value={settings.oscWave}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              hue="#f59e0b"
              onChange={(v) => set("oscWave", v)}
            />
            <Knob
              label="Timbre"
              value={settings.oscTimbre}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              hue="#f59e0b"
              onChange={(v) => set("oscTimbre", v)}
            />
          </div>
        </Module>

        <Module title="Filter" hue="#22d3ee">
          <SegmentedRow
            options={FILTER_TYPES}
            value={settings.filterType}
            onChange={(v) => set("filterType", v)}
            ariaLabel="Filter type"
          />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Knob
              label="Cutoff"
              value={settings.filterCutoff}
              min={80}
              max={8000}
              step={10}
              format={hz}
              hue="#22d3ee"
              onChange={(v) => set("filterCutoff", v)}
            />
            <Knob
              label="Reso"
              value={settings.filterResonance}
              min={0}
              max={10}
              step={0.1}
              format={(v) => v.toFixed(1)}
              hue="#22d3ee"
              onChange={(v) => set("filterResonance", v)}
            />
            <Knob
              label="Env →"
              value={settings.filterEnvAmount}
              min={-1}
              max={1}
              step={0.01}
              format={(v) => (v >= 0 ? `+${(v * 100).toFixed(0)}` : (v * 100).toFixed(0))}
              hue="#22d3ee"
              bipolar
              onChange={(v) => set("filterEnvAmount", v)}
            />
          </div>
        </Module>

        <Module title="Envelope" hue="#a78bfa">
          <div className="grid grid-cols-4 gap-2">
            <Knob
              label="Atk"
              value={settings.attack}
              min={0.001}
              max={2}
              step={0.005}
              format={sec}
              hue="#a78bfa"
              onChange={(v) => set("attack", v)}
            />
            <Knob
              label="Dec"
              value={settings.decay}
              min={0.01}
              max={2}
              step={0.01}
              format={sec}
              hue="#a78bfa"
              onChange={(v) => set("decay", v)}
            />
            <Knob
              label="Sus"
              value={settings.sustain}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              hue="#a78bfa"
              onChange={(v) => set("sustain", v)}
            />
            <Knob
              label="Rel"
              value={settings.release}
              min={0.01}
              max={4}
              step={0.01}
              format={sec}
              hue="#a78bfa"
              onChange={(v) => set("release", v)}
            />
          </div>
        </Module>

        <Module title="LFO" hue="#ec4899">
          <SegmentedRow
            options={LFO_SHAPES}
            value={settings.lfoShape}
            onChange={(v) => set("lfoShape", v)}
            ariaLabel="LFO shape"
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Knob
              label="Rate"
              value={settings.lfoRate}
              min={0.05}
              max={20}
              step={0.05}
              format={(v) => `${v.toFixed(2)} Hz`}
              hue="#ec4899"
              onChange={(v) => set("lfoRate", v)}
            />
            <Knob
              label="Amount"
              value={settings.lfoAmount}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              hue="#ec4899"
              onChange={(v) => set("lfoAmount", v)}
            />
          </div>
        </Module>

        <Module title="Cycling Env" hue="#fb923c">
          <div className="grid grid-cols-2 gap-2">
            <Knob
              label="Rate"
              value={settings.cycEnvRate}
              min={0.05}
              max={8}
              step={0.05}
              format={(v) => `${v.toFixed(2)} Hz`}
              hue="#fb923c"
              onChange={(v) => set("cycEnvRate", v)}
            />
            <Knob
              label="Amount"
              value={settings.cycEnvAmount}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              hue="#fb923c"
              onChange={(v) => set("cycEnvAmount", v)}
            />
          </div>
          <p className="mt-2 text-[9px] leading-tight text-white/40">
            Routed to filter Q for swelling resonance.
          </p>
        </Module>

        <Module title="FX" hue="#2dd4bf">
          <div className="grid grid-cols-2 gap-2">
            <Knob
              label="Delay"
              value={settings.delayWet}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              hue="#2dd4bf"
              onChange={(v) => set("delayWet", v)}
            />
            <Knob
              label="Time"
              value={settings.delayTime}
              min={0}
              max={1}
              step={0.01}
              format={sec}
              hue="#2dd4bf"
              onChange={(v) => set("delayTime", v)}
            />
            <Knob
              label="FB"
              value={settings.delayFeedback}
              min={0}
              max={0.9}
              step={0.01}
              format={pct}
              hue="#2dd4bf"
              onChange={(v) => set("delayFeedback", v)}
            />
            <Knob
              label="Reverb"
              value={settings.reverbWet}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              hue="#2dd4bf"
              onChange={(v) => set("reverbWet", v)}
            />
          </div>
        </Module>

        <Module title="Output" hue="#d4ff3a" className="sm:col-span-2">
          <div className="grid grid-cols-3 gap-2">
            <Knob
              label="Glide"
              value={settings.glide}
              min={0}
              max={0.5}
              step={0.005}
              format={sec}
              hue="#d4ff3a"
              onChange={(v) => set("glide", v)}
            />
            <Knob
              label="Volume"
              value={settings.masterVolume}
              min={-40}
              max={0}
              step={0.5}
              format={(v) => `${v.toFixed(1)} dB`}
              hue="#d4ff3a"
              onChange={(v) => set("masterVolume", v)}
            />
            <Knob
              label="Visual"
              value={settings.visualReactivity}
              min={0}
              max={1}
              step={0.01}
              format={pct}
              hue="#d4ff3a"
              onChange={(v) => set("visualReactivity", v)}
            />
          </div>
        </Module>
      </div>

      <footer className="mt-3 text-[10px] leading-tight text-white/40">
        Home row plays notes · Shift = +1 oct · Alt = −1 oct · Esc closes
      </footer>
    </aside>
  );
}

// ---------- Modules ---------------------------------------------------------

function Module({
  title,
  hue,
  className = "",
  children,
}: {
  title: string;
  hue: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-lg border border-white/10 bg-white/[0.02] p-3 ${className}`}
    >
      <header className="mb-2 flex items-center gap-2">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: hue, boxShadow: `0 0 6px ${hue}` }}
        />
        <h3
          className="text-[10px] uppercase tracking-[0.22em]"
          style={{ color: hue }}
        >
          {title}
        </h3>
      </header>
      {children}
    </section>
  );
}

function EngineSelector({
  value,
  onChange,
}: {
  value: OscEngine;
  onChange: (v: OscEngine) => void;
}) {
  const idx = ENGINES.findIndex((e) => e.value === value);
  const current = ENGINES[Math.max(0, idx)];
  const cycle = (delta: number) => {
    const next = (idx + delta + ENGINES.length) % ENGINES.length;
    onChange(ENGINES[next].value);
  };
  return (
    <div
      className="flex items-center justify-between rounded border border-white/10 bg-black/40 px-2 py-1.5"
      role="group"
      aria-label="Oscillator engine"
    >
      <button
        onClick={() => cycle(-1)}
        className="px-1 text-white/60 hover:text-white"
        aria-label="Previous engine"
      >
        ◀
      </button>
      <div className="flex flex-col items-center">
        <span className="text-[13px] font-semibold tracking-wide text-white">
          {current.label}
        </span>
        <span className="text-[9px] uppercase tracking-widest text-white/40">
          {current.blurb}
        </span>
      </div>
      <button
        onClick={() => cycle(+1)}
        className="px-1 text-white/60 hover:text-white"
        aria-label="Next engine"
      >
        ▶
      </button>
    </div>
  );
}

function SegmentedRow<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex gap-1 rounded border border-white/10 bg-black/40 p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded px-2 py-1 text-[10px] uppercase tracking-widest transition ${
            value === o.value
              ? "bg-white/15 text-white"
              : "text-white/50 hover:bg-white/5 hover:text-white/80"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Knob primitive --------------------------------------------------

type KnobProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (v: number) => string;
  hue: string;
  bipolar?: boolean;
  onChange: (v: number) => void;
};

function Knob({
  label,
  value,
  min,
  max,
  step = 0.01,
  format,
  hue,
  bipolar = false,
  onChange,
}: KnobProps) {
  const id = useId();
  const size = 44;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  const norm = clamp01((value - min) / (max - min));
  const angleDeg = -135 + norm * 270;

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const startY = e.clientY;
      const startVal = value;
      const range = max - min;
      const fine = e.shiftKey ? 0.25 : 1;
      const sensitivity = 200 / fine;

      const move = (ev: PointerEvent) => {
        const dy = startY - ev.clientY;
        const next = startVal + (dy / sensitivity) * range;
        onChange(quantize(next, min, max, step));
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [value, min, max, step, onChange],
  );

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const range = max - min;
    let delta = 0;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") delta = step;
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") delta = -step;
    else if (e.key === "PageUp") delta = range * 0.1;
    else if (e.key === "PageDown") delta = -range * 0.1;
    else if (e.key === "Home") {
      e.preventDefault();
      onChange(min);
      return;
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(max);
      return;
    } else return;
    e.preventDefault();
    onChange(quantize(value + delta, min, max, step));
  };

  // Arc geometry
  const trackPath = arcPath(cx, cy, r, -135, 135);
  const valuePath = bipolar
    ? arcPath(cx, cy, r, 0, angleDeg)
    : arcPath(cx, cy, r, -135, angleDeg);

  // Indicator line endpoint
  const indRad = ((angleDeg - 90) * Math.PI) / 180;
  const ix = cx + (r - 3) * Math.cos(indRad);
  const iy = cy + (r - 3) * Math.sin(indRad);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        role="slider"
        aria-labelledby={`${id}-label`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number(value.toFixed(3))}
        aria-valuetext={format(value)}
        tabIndex={0}
        width={size}
        height={size}
        onPointerDown={onPointerDown}
        onKeyDown={onKey}
        onDoubleClick={() => onChange(bipolar ? 0 : (min + max) / 2)}
        className="cursor-grab touch-none rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <path d={trackPath} stroke="rgba(255,255,255,0.1)" strokeWidth={3} fill="none" strokeLinecap="round" />
        <path
          d={valuePath}
          stroke={hue}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px ${hue})` }}
        />
        <circle cx={cx} cy={cy} r={r - 6} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" />
        <line
          x1={cx}
          y1={cy}
          x2={ix}
          y2={iy}
          stroke={hue}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
      <span
        id={`${id}-label`}
        className="text-[9px] uppercase tracking-widest text-white/55"
      >
        {label}
      </span>
      <span className="text-[9.5px] tabular-nums text-white/80">
        {format(value)}
      </span>
    </div>
  );
}

// ---------- helpers ---------------------------------------------------------

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function quantize(v: number, min: number, max: number, step: number): number {
  const clamped = Math.max(min, Math.min(max, v));
  if (step <= 0) return clamped;
  const decimals = (step.toString().split(".")[1] || "").length;
  const stepped = Math.round((clamped - min) / step) * step + min;
  const factor = Math.pow(10, decimals);
  return Math.round(stepped * factor) / factor;
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  // Knob angle: 0 = top (12 o'clock), positive = clockwise.
  // SVG uses 0 = right (3 o'clock); subtract 90 to convert.
  if (Math.abs(endDeg - startDeg) < 0.01) {
    // Render a tiny zero-length stub so the path is still valid.
    const [x, y] = polar(cx, cy, r, startDeg);
    return `M ${x} ${y}`;
  }
  const [sx, sy] = polar(cx, cy, r, startDeg);
  const [ex, ey] = polar(cx, cy, r, endDeg);
  const sweep = endDeg > startDeg ? 1 : 0;
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} ${sweep} ${ex} ${ey}`;
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

const pct = (v: number) => `${Math.round(v * 100)}`;
const hz = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} k` : `${v.toFixed(0)} Hz`);
const sec = (v: number) =>
  v >= 1 ? `${v.toFixed(2)} s` : `${(v * 1000).toFixed(0)} ms`;
