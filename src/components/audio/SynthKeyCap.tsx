"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KEYBOARD_NOTES } from "./keyboardMapping";
import { hexToRgb01, keyColor } from "@/lib/notePalette";

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

type Size = "sm" | "lg";
type Tone = "light" | "dark";

const SIZES: Record<Size, string> = {
  sm: "h-6 min-w-[1.5rem] rounded px-1.5 text-[11px]",
  lg: "h-12 min-w-[2.75rem] flex-1 rounded-md px-2 text-sm",
};

// Two idle treatments, because the caps live on cream in the footer and on the
// panel's dark glass. Struck, both go to the key's own palette colour — that's
// the whole point, so the cap and the light the background throws match.
const TONES: Record<Tone, string> = {
  light: "border-black/15 text-black/70",
  dark: "border-white/20 text-white/70",
};

// Which ink stays legible on a given cap when it lights up. Rec. 709 luma on
// the raw sRGB values is close enough for a two-way choice, and the palette has
// no borderline cases — the yellows and the light blue take black, the rest white.
function inkFor(hex: string) {
  const [r, g, b] = hexToRgb01(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? "#161616" : "#ffffff";
}

function dispatchKey(
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
  const note = KEYBOARD_NOTES[keyName];
  const color = keyColor(keyName);
  const [active, setActive] = useState(false);

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
      // The lit look is inline because the colour is data, not a design token —
      // a palette entry picked per key, which Tailwind has no class for. Hover
      // takes the same colour on the border and letter only, so a cap previews
      // the light its note will throw before you commit to playing it.
      style={
        active
          ? {
              backgroundColor: color,
              borderColor: color,
              color: inkFor(color),
              boxShadow: `0 0 12px ${color}80`,
            }
          : { ["--cap" as string]: color }
      }
      className={`inline-flex touch-none cursor-pointer select-none flex-col items-center justify-center border font-mono uppercase leading-none transition-[background-color,border-color,color,box-shadow] duration-100 ${
        SIZES[size]
      } ${
        active
          ? ""
          : // `color:` prefix, not a bare var: Tailwind can't tell a colour from
            // a width behind a custom property, and `border-[var(--cap)]` would
            // compile to a border-width.
            `${TONES[tone]} hover:border-[color:var(--cap)] hover:text-[color:var(--cap)]`
      } ${className}`}
    >
      <kbd className="font-mono">{keyName}</kbd>
      {showNote && (
        <span className="mt-1 text-[9px] tracking-wide opacity-60">{note}</span>
      )}
    </button>
  );
}

/**
 * The full home-row mapping as one playable strip. Used at size `lg` in the
 * synth panel; the footer shows a four-key excerpt instead.
 */
export function SynthKeyCapRow({
  size = "lg",
  tone = "dark",
  showNote = true,
}: {
  size?: Size;
  tone?: Tone;
  showNote?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1" aria-label="Playable keys">
      {Object.keys(KEYBOARD_NOTES).map((k) => (
        <SynthKeyCap
          key={k}
          keyName={k}
          size={size}
          tone={tone}
          showNote={showNote}
        />
      ))}
    </div>
  );
}
