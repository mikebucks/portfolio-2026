"use client";

import { useThemeStore } from "@/lib/store";
import { THEME_PRESETS } from "@/components/webgl/materials/shaders/themes";

export function ThemeSwitcher() {
  const theme = useThemeStore((s) => s.theme);
  const cycleTheme = useThemeStore((s) => s.cycleTheme);
  const label = THEME_PRESETS[theme].label;

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="font-mono text-xs uppercase tracking-widest text-white/80 hover:text-accent"
      aria-label={`Theme: ${label}. Click to cycle.`}
    >
      ◐ {label}
    </button>
  );
}
