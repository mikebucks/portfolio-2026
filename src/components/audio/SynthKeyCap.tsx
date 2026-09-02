"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KEYBOARD_NOTES, shiftOctave } from "./keyboardMapping";
import { hexToRgb01, keyColor } from "@/lib/notePalette";
import { useResolvedSynthSettings } from "@/lib/store";

/**
 * A playable key cap: looks like a `<kbd>`, behaves like a key.
 *
 * It doesn't touch the synth engine directly — it dispatches real keydown /
 * keyup events on `window`, which is exactly what `useSynthControls` already
 * listens for. So a press here walks the same path as a physical press: the
 * audio graph unlocks on first intent, Shift / Alt still shift the octave, the
 * A+S+D chord still opens the panel, and there is only one place where a note
 * turns into sound. (Events dispatched on `window` fire only window listeners —
 * they don't re-enter this component's own handlers, so there's no loop.)
 *
 * Lit state is derived from those same window events rather than from the
 * pointer, so a cap lights up whether you clicked it or pressed the key on your
 * keyboard.
 */

type Size = "sm" | "md" | "lg";
type Tone = "light" | "dark" | "solid";

const SIZES: Record<Size, string> = {
  sm: "h-6 min-w-[1.5rem] rounded px-1.5 text-[11px]",
  // md, unlike lg, doesn't flex-1: the hero row is a content-sized strip, not a
  // panel-width grid, so the caps hold their own width.
  md: "h-10 min-w-[2.5rem] rounded-md px-2 text-sm",
  lg: "h-12 min-w-[2.75rem] flex-1 rounded-md px-2 text-lg",
};

// Three idle treatments, because the caps live on cream in the footer, on the
// panel's dark glass, and straight on the hero's shader — where an outline-only
// cap all but disappears, so `solid` gives it its own black plate. At rest the
// cap stays neutral — the only colour is the sticker dot in the corner; struck
// or hovered, the whole cap goes to the key's palette colour, so the cap and
// the light the background throws match.
const TONES: Record<Tone, string> = {
  light: "border-black/15 text-black/70",
  dark: "border-white/50 text-white/70",
  solid: "border-black bg-black text-white/90",
};

// Which ink stays legible on a given cap when it lights up. Rec. 709 luma on
// the raw sRGB values is close enough for a two-way choice, and the palette has
// no borderline cases — the yellows and the light blue take black, the rest white.
function inkFor(hex: string) {
  const [r, g, b] = hexToRgb01(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? "#161616" : "#ffffff";
}

/**
 * Fire a synthetic key event on `window` — the same path a physical press
 * takes, so everything that listens for keys (the engine wiring, the caps' lit
 * state) answers identically. Exported for the piano roll, which routes its
 * mapped notes through here so the matching cap lights up.
 */
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
  // The label tells the truth: it's the pitch this key will actually sound
  // under the current octave — the preset's own register plus the player's
  // shift — not the resting mapping. Colour stays the key's own (keyColor is
  // untransposed identity), so a cap keeps its hue while its number moves.
  const octave = useResolvedSynthSettings().octave;
  const note = baseNote ? shiftOctave(baseNote, octave) : undefined;
  const color = keyColor(keyName);
  const [active, setActive] = useState(false);
  // Hover wears the full lit look, so pointing at a cap and playing it are the
  // same picture. Tracked in React rather than CSS because the lit style is
  // inline (per-key colour). Mouse only — a touch press is already `active`,
  // and a sticky post-tap hover would leave the cap lit after the finger left.
  const [hovered, setHovered] = useState(false);

  // The pointer handlers need to read "is this key already down?" without
  // re-binding, and the unmount cleanup needs it after the last render.
  const activeRef = useRef(false);
  activeRef.current = active;
  // Set while *this* cap is holding the key down, so we only ever release a
  // note we started — a physical press that lit the cap stays the keyboard's.
  const heldByPointer = useRef(false);

  const press = useCallback(
    (mods: { shiftKey: boolean; altKey: boolean }) => {
      // Already sounding from a physical press: don't double-attack it, and
      // don't take ownership of a release that isn't ours.
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

  // Mirror the real key state. `blur` / `visibilitychange` are here for the same
  // reason useSynthControls has them: the browser eats keyups when the window
  // loses focus, and a cap stuck lit is as wrong as a note stuck sounding.
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
      // Unmounting mid-press (navigating away with the pointer down) would
      // otherwise strand the note — the engine lives above this component.
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
      // Pointer capture keeps the release ours even if the press drags off the
      // cap; `touch-none` stops a press from scrolling the page instead.
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        press({ shiftKey: e.shiftKey, altKey: e.altKey });
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      // Keyboard users get the cap too: Enter / Space play it. The mapped key
      // itself already works from anywhere, focus or not.
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
      // The lit look is inline because the colour is data, not a design token —
      // a palette entry picked per key, which Tailwind has no class for. One
      // look, three triggers: hover, pointer press, and the physical key all
      // light the cap identically — hovering previews exactly what playing
      // does. At rest the cap is neutral; the corner dot carries the colour.
      style={
        active || hovered
          ? {
              backgroundColor: color,
              borderColor: color,
              color: inkFor(color),
              boxShadow: `0 0 12px ${color}80`,
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

/**
 * The full home-row mapping as a playable strip, split into equal rows of five
 * so the caps line up in a grid instead of wrapping wherever the width says.
 * Used at size `lg` in the synth panel; the footer shows a four-key excerpt
 * instead.
 */
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
