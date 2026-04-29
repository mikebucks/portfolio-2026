"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useThemeStore, useUIStore } from "@/lib/store";
import {
  THEME_IDS,
  THEME_PRESETS,
  type ThemeId,
} from "@/components/webgl/materials/shaders/themes";
import { useAudio } from "@/components/audio/AudioProvider";

/**
 * The synth panel. One row picks the theme; below it sit four playable macro
 * sliders. Each macro morphs many synth parameters at once and is also fed
 * into the matching shader as `uMacros`, so audio and visuals respond to the
 * same gestures.
 */
export function SynthPanel() {
  const open = useUIStore((s) => s.synthPanelOpen);
  const setOpen = useUIStore((s) => s.setSynthPanel);
  const theme = useThemeStore((s) => s.theme);
  const macros = useThemeStore((s) => s.macros[s.theme]);
  const setMacro = useThemeStore((s) => s.setMacro);
  const resetMacros = useThemeStore((s) => s.resetMacros);
  const { unlocked, unlock } = useAudio();

  const preset = THEME_PRESETS[theme];

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
      role="dialog"
      aria-label="Synth controls"
      className="fixed bottom-20 right-4 z-40 w-[min(420px,calc(100vw-2rem))] rounded-xl border border-white/10 bg-black/85 p-4 font-mono text-xs text-white shadow-2xl backdrop-blur-md"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            Theme · Synth
          </span>
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
            onClick={resetMacros}
            className="rounded border border-white/15 bg-white/5 px-2 py-1 hover:bg-white/10"
            title="Reset macros to preset defaults"
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

      <ThemePicker />

      <p className="mt-2 text-[10px] leading-snug text-white/45">
        {preset.blurb}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {preset.macros.map((macro, i) => (
          <MacroSlider
            key={`${theme}-${i}`}
            label={macro.label}
            hint={macro.hint}
            value={macros[i]}
            onChange={(v) => setMacro(i as 0 | 1 | 2 | 3, v)}
          />
        ))}
      </div>

      <footer className="mt-4 text-[10px] leading-tight text-white/40">
        Home row plays notes · Shift = +1 oct · Alt = −1 oct · Esc closes
      </footer>
    </aside>
  );
}

// ── Theme picker ───────────────────────────────────────────────────────────

function ThemePicker() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="mt-3 flex gap-1 rounded border border-white/10 bg-black/40 p-1"
    >
      {THEME_IDS.map((id) => {
        const active = id === theme;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(id as ThemeId)}
            className={`flex-1 rounded px-2 py-1.5 text-[10px] uppercase tracking-widest transition ${
              active
                ? "bg-white/15 text-white shadow-[0_0_10px_rgba(255,255,255,0.08)]"
                : "text-white/55 hover:bg-white/5 hover:text-white/85"
            }`}
            title={THEME_PRESETS[id].blurb}
          >
            {THEME_PRESETS[id].label}
          </button>
        );
      })}
    </div>
  );
}

// ── Macro slider ───────────────────────────────────────────────────────────

type MacroSliderProps = {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
};

/**
 * Vertical-drag slider rendered as a horizontal arc. 0..1 only — the macro
 * itself does the lerp into synth-parameter space.
 */
function MacroSlider({ label, hint, value, onChange }: MacroSliderProps) {
  const id = useId();
  const trackRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const el = trackRef.current;
      if (!el) return;
      el.setPointerCapture?.(e.pointerId);

      const update = (clientX: number) => {
        const rect = el.getBoundingClientRect();
        const x = (clientX - rect.left) / rect.width;
        onChange(clamp01(x));
      };
      update(e.clientX);

      const move = (ev: PointerEvent) => update(ev.clientX);
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [onChange],
  );

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    let delta = 0;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") delta = 0.02;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") delta = -0.02;
    else if (e.key === "PageUp") delta = 0.1;
    else if (e.key === "PageDown") delta = -0.1;
    else if (e.key === "Home") {
      e.preventDefault();
      onChange(0);
      return;
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(1);
      return;
    } else return;
    e.preventDefault();
    onChange(clamp01(value + delta));
  };

  const pct = Math.round(value * 100);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
      <div className="flex items-baseline justify-between">
        <span
          id={`${id}-label`}
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85"
        >
          {label}
        </span>
        <span className="text-[10px] tabular-nums text-white/55">{pct}</span>
      </div>
      <div
        ref={trackRef}
        role="slider"
        aria-labelledby={`${id}-label`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${pct} percent`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onKeyDown={onKey}
        onDoubleClick={() => onChange(0.5)}
        className="relative mt-2 h-7 cursor-pointer touch-none rounded-full bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(90deg, rgba(212,255,58,0.25), rgba(212,255,58,0.65))",
            boxShadow: "0 0 10px rgba(212,255,58,0.35) inset",
          }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-1.5 -translate-y-1/2 rounded-sm bg-accent shadow-[0_0_8px_rgba(212,255,58,0.7)]"
          style={{ left: `calc(${pct}% - 3px)` }}
        />
      </div>
      <p className="mt-1.5 text-[9.5px] leading-snug text-white/40">{hint}</p>
    </div>
  );
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
