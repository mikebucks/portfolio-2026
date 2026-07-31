"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useThemeStore, useUIStore } from "@/lib/store";
import {
  THEME_IDS,
  THEME_PRESETS,
  type ThemeId,
} from "@/components/webgl/materials/shaders/themes";

/**
 * The synth panel. A row of themes picks the sound + visuals; each theme maps
 * 1:1 to a preset whose `baseSettings` are the whole voice. Per-parameter
 * controls will live here later; for now the sound is edited directly in the
 * preset.
 *
 * No chrome of its own — the seal in the header is the open/close control, and
 * the audio context unlocks on the first gesture anywhere (AudioProvider), so
 * neither a close button nor an "enable audio" prompt belongs in here.
 */
export function SynthPanel() {
  const open = useUIStore((s) => s.synthPanelOpen);
  const setOpen = useUIStore((s) => s.setSynthPanel);
  const theme = useThemeStore((s) => s.theme);

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

  // Portalled to <body>. The panel renders from inside the <header>, and the
  // header's backdrop-filter makes it the containing block for fixed-position
  // descendants — so `bottom` would resolve against the ~5rem-tall bar instead
  // of the viewport. `data-modal-hide` is carried over by hand so the panel
  // still fades out behind the project modal from its new home.
  return createPortal(
    <aside
      role="dialog"
      aria-label="Synth controls"
      data-modal-hide
      // Spans the full height of the frame's inner opening: it starts below the
      // header bar (--header-h, published by Header) so the nav stays visible
      // and clickable, and stops on the cream frame's 10px rails — which the
      // safe-area insets extend on notched devices, matching layout.tsx.
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + var(--header-h, 5rem))",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
        right: "calc(env(safe-area-inset-right, 0px) + 10px)",
      }}
      className="fixed z-40 flex w-[min(420px,calc(100vw-2rem-20px))] flex-col rounded-xl border border-white/10 bg-black/85 p-4 font-mono text-xs text-white shadow-2xl backdrop-blur-md"
    >
      {/* The panel is now viewport-tall, so the controls take the slack and
          scroll on their own — data-lenis-prevent keeps the smooth-scroll
          instance from stealing the wheel and scrolling the page instead. */}
      <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto">
        <ThemePicker />

        <p className="mt-2 text-[10px] leading-snug text-white/45">
          {preset.blurb}
        </p>
      </div>

      <footer className="mt-4 shrink-0 text-[10px] leading-tight text-white/40">
        Home row plays notes · Shift = +1 oct · Alt = −1 oct · Esc closes
      </footer>
    </aside>,
    document.body,
  );
}

// ── Theme picker ───────────────────────────────────────────────────────────

function ThemePicker() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  // "Chance" is a roll, not a theme, so it stays out of THEME_IDS: every
  // Record<ThemeId, …> behind it (THEME_PRESETS, THEMES, the shader lookup)
  // would otherwise need a member with no shader and no voice to give it.
  // It draws from the other six — rolling the theme already playing would
  // read as a dead button.
  const roll = () => {
    const others = THEME_IDS.filter((id) => id !== theme);
    setTheme(others[Math.floor(Math.random() * others.length)]);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Principle"
      className="grid grid-cols-2 gap-1 rounded border border-white/10 bg-black/40 p-1"
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

      {/* Fills the eighth cell the seven principles leave open. Not a radio —
          it never holds the selection, it hands it to one of the others. */}
      <button
        type="button"
        onClick={roll}
        title="Pick a principle at random"
        className="rounded px-2 py-1.5 text-center text-[10px] uppercase tracking-wider text-white/55 transition hover:bg-white/5 hover:text-white/85"
      >
        Chance
      </button>
    </div>
  );
}
