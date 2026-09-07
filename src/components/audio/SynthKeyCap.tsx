"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KEYBOARD_NOTES, shiftOctave } from "./keyboardMapping";
import { hexToRgb01, keyColor } from "@/lib/notePalette";
import { useResolvedSynthSettings } from "@/lib/store";

/**
 * A playable key cap. Dispatches real keydown/keyup on `window`, so a press
 * walks the same path as a physical key (useSynthControls) and lit state
 * follows those events whether the cap or the keyboard was pressed.
 */

type Size = "sm" | "md" | "lg";
type Tone = "light" | "dark" | "solid";

const SIZES: Record<Size, string> = {
  sm: "h-6 min-w-[1.5rem] rounded px-1.5 text-[11px]",
  // md holds its own width: the toggle strip is content-sized, not a grid.
  md: "h-10 min-w-[2.5rem] rounded-md px-2 text-sm",
  lg: "h-12 min-w-[2.75rem] flex-1 rounded-md px-2 text-lg",
};

// `solid`: outline-only caps vanish over the shader.
const TONES: Record<Tone, string> = {
  light: "border-black/15 text-black/70",
  dark: "border-white/50 text-white/70",
  solid: "border-black bg-black text-white/90",
};

// Rec. 709 luma; the palette has no borderline cases.
function inkFor(hex: string) {
  const [r, g, b] = hexToRgb01(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? "#161616" : "#ffffff";
}

/** Synthetic key event on `window`, the same path a physical press takes. */
export function dispatchKey(
  type: "keydown" | "keyup",
  key: string,
  mods?: { shiftKey?: boolean; altKey?: boolean },
) {
  window.dispatchEvent(
    new KeyboardEvent(type, {
      key,
      shiftKey: mods?.shiftKey ?? false,
      altKey: mods?.altKey ?? false,
    }),
  );
}

export function SynthKeyCap({
  keyName,
  size = "sm",
  tone = "light",
  showNote = false,
  className = "",
}: {
  /** The key this cap stands for, as `event.key` — "a", ";" … */
  keyName: string;
  size?: Size;
  tone?: Tone;
  /** Print the note the key plays under the letter. */
  showNote?: boolean;
  className?: string;
}) {
  const baseNote = KEYBOARD_NOTES[keyName];
  // Label shows the pitch under the current octave; colour stays the key's own.
  const octave = useResolvedSynthSettings().octave;
  const note = baseNote ? shiftOctave(baseNote, octave) : undefined;
  const color = keyColor(keyName);
  const [active, setActive] = useState(false);
  // Hover wears the lit look. Mouse only: a sticky post-tap hover would leave
  // the cap lit.
  const [hovered, setHovered] = useState(false);

  const activeRef = useRef(false);
  activeRef.current = active;
  // Only release notes this cap started.
  const heldByPointer = useRef(false);

  const press = useCallback(
    (mods: { shiftKey: boolean; altKey: boolean }) => {
      // Already sounding from a physical press: don't double-attack.
      if (activeRef.current || heldByPointer.current) return;
      heldByPointer.current = true;
      dispatchKey("keydown", keyName, mods);
    },
    [keyName],
  );

  const release = useCallback(() => {
    if (!heldByPointer.current) return;
    heldByPointer.current = false;
    dispatchKey("keyup", keyName);
  }, [keyName]);

  // blur/visibilitychange: the browser eats keyups when focus is lost.
  useEffect(() => {
    const match = (e: KeyboardEvent) => e.key.toLowerCase() === keyName;
    const onDown = (e: KeyboardEvent) => {
      if (match(e) && !e.metaKey && !e.ctrlKey) setActive(true);
    };
    const onUp = (e: KeyboardEvent) => {
      if (match(e)) setActive(false);
    };
    const reset = () => {
      heldByPointer.current = false;
      setActive(false);
    };
    const onVisibility = () => {
      if (document.hidden) reset();
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", onVisibility);
      // Unmounting mid-press would strand the note.
      if (heldByPointer.current) {
        heldByPointer.current = false;
        dispatchKey("keyup", keyName);
      }
    };
  }, [keyName]);

  if (!note) return null;

  return (
    <button
      type="button"
      aria-label={`Play ${note}`}
      aria-pressed={active}
      // Capture keeps the release ours if the press drags off; touch-none
      // stops a press from scrolling.
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        press({ shiftKey: e.shiftKey, altKey: e.altKey });
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        if (e.repeat) return;
        press({ shiftKey: e.shiftKey, altKey: e.altKey });
      }}
      onKeyUp={(e) => {
        if (e.key === "Enter" || e.key === " ") release();
      }}
      onBlur={release}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      // Inline: the colour is per-key data, not a token.
      style={
        active || hovered
          ? {
              backgroundColor: color,
              borderColor: color,
              color: inkFor(color),
              // boxShadow: `0 0 12px ${color}80`,
            }
          : undefined
      }
      className={`relative inline-flex touch-none cursor-pointer select-none flex-col items-center justify-center border font-mono uppercase leading-none transition-[background-color,border-color,color,box-shadow] duration-100 ${
        SIZES[size]
      } ${active || hovered ? "" : TONES[tone]} ${className}`}
    >
      {/* {showNote && (
        // The key's colour swatch — the same marking the piano roll wears as a
        // bottom bar, worn here as a corner dot. Lit, the cap floods with that
        // colour and the dot simply dissolves into it.
        <span
          className="pointer-events-none absolute right-2 top-2 h-1 w-1 rounded-full"
          style={{ backgroundColor: color }}
        />
      )} */}
      <kbd className="font-mono">{keyName}</kbd>
      {showNote && (
        <span className="mt-1 text-[9px] tracking-wide opacity-60">{note}</span>
      )}
    </button>
  );
}

/** The full mapping in rows of five, so the caps grid instead of wrapping. */
const KEYS_PER_ROW = 5;

export function SynthKeyCapRow({
  size = "lg",
  tone = "dark",
  showNote = true,
}: {
  size?: Size;
  tone?: Tone;
  showNote?: boolean;
}) {
  const keys = Object.keys(KEYBOARD_NOTES);
  const rows: string[][] = [];
  for (let i = 0; i < keys.length; i += KEYS_PER_ROW) {
    rows.push(keys.slice(i, i + KEYS_PER_ROW));
  }

  return (
    <div className="flex flex-col gap-1" aria-label="Playable keys">
      {rows.map((row) => (
        <div key={row[0]} className="flex gap-1">
          {row.map((k) => (
            <SynthKeyCap
              key={k}
              keyName={k}
              size={size}
              tone={tone}
              showNote={showNote}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
