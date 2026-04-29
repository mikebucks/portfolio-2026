"use client";

import { useUIStore } from "@/lib/store";
import { THEMES } from "@/components/webgl/materials/shaders/themes";

export function ThemeSwitcher() {
  const theme = useUIStore((s) => s.theme);
  const cycleTheme = useUIStore((s) => s.cycleTheme);
  const label = THEMES[theme].label;

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
