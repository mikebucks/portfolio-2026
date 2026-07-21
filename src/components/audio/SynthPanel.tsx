"use client";

import { useEffect } from "react";
import { useThemeStore, useUIStore } from "@/lib/store";
import {
  THEME_IDS,
  THEME_PRESETS,
  type ThemeId,
} from "@/components/webgl/materials/shaders/themes";
import { useAudio } from "@/components/audio/AudioProvider";

/**
 * The synth panel. A row of themes picks the sound + visuals; each theme maps
 * 1:1 to a preset whose `baseSettings` are the whole voice. Per-parameter
 * controls will live here later; for now the sound is edited directly in the
 * preset.
 */
export function SynthPanel() {
  const open = useUIStore((s) => s.synthPanelOpen);
  const setOpen = useUIStore((s) => s.setSynthPanel);
  const theme = useThemeStore((s) => s.theme);
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
      className="fixed top-0 right-0 z-40 w-[min(420px,calc(100vw-2rem))] rounded-xl border border-white/10 bg-black/85 p-4 font-mono text-xs text-white shadow-2xl backdrop-blur-md"
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
      aria-label="Principle"
      className="mt-3 grid grid-cols-2 gap-1 rounded border border-white/10 bg-black/40 p-1"
    >
      {THEME_IDS.map((id) => {
        const active = id === theme;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(id as ThemeId)}
            className={`rounded px-2 py-1.5 text-center text-[10px] uppercase tracking-wider transition ${
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
