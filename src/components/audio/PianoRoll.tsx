"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAudio } from "./AudioProvider";
import { KEYBOARD_NOTES, shiftOctave } from "./keyboardMapping";
import { dispatchKey } from "./SynthKeyCap";
import { keyColor } from "@/lib/notePalette";
import {
  OCTAVE_SHIFT_MAX,
  OCTAVE_SHIFT_MIN,
  useResolvedSynthSettings,
  useSynthTweakStore,
  useThemeStore,
} from "@/lib/store";
import { resolveSettings } from "@/components/webgl/materials/shaders/themes";
import { visualBus } from "@/lib/visualEvents";

/**
 * Slim C1–C7 piano strip plus octave controls; doubles as the octave indicator.
 * Home-row-mapped notes play via synthetic key events so the caps light up;
 * unmapped notes go to the engine directly, un-shifted by the octave.
 * Lit state comes from the visualBus (engine's post-transpose pitch).
 */

const LOW_OCT = 1;
const WHITE_PITCHES = ["C", "D", "E", "F", "G", "A", "B"] as const;
const SHARP_AFTER: Record<string, string | null> = {
  C: "C#",
  D: "D#",
  E: null,
  F: "F#",
  G: "G#",
  A: "A#",
  B: null,
};

type RollKey = { note: string; whiteIndex: number };

function buildKeys(): { whites: RollKey[]; blacks: RollKey[] } {
  const whites: RollKey[] = [];
  const blacks: RollKey[] = [];
  let whiteIndex = 0;
  for (let oct = LOW_OCT; oct < LOW_OCT + 6; oct++) {
    for (const pitch of WHITE_PITCHES) {
      whites.push({ note: `${pitch}${oct}`, whiteIndex });
      const sharp = SHARP_AFTER[pitch];
      if (sharp) blacks.push({ note: `${sharp}${oct}`, whiteIndex });
      whiteIndex++;
    }
  }
  whites.push({ note: `C${LOW_OCT + 6}`, whiteIndex });
  return { whites, blacks };
}

const { whites: WHITES, blacks: BLACKS } = buildKeys();
const WHITE_W = 100 / WHITES.length;

export function PianoRoll() {
  const audio = useAudio();
  const settings = useResolvedSynthSettings();
  const octave = settings.octave;

  // Refs: a press must not close over values current when it started.
  const audioRef = useRef(audio);
  const octaveRef = useRef(octave);
  audioRef.current = audio;
  octaveRef.current = octave;

  // absNote → release route, fixed at press time (octave can move mid-hold).
  const held = useRef(new Map<string, { key: string } | { raw: string }>());

  // Sounding pitches; the ref is read synchronously by press().
  const soundingRef = useRef(new Set<string>());
  const [sounding, setSounding] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  useEffect(() => {
    const off = visualBus.on((e) => {
      if (e.type === "note_on") {
        soundingRef.current.add(e.note);
        setSounding((prev) =>
          prev.has(e.note) ? prev : new Set(prev).add(e.note),
        );
      } else if (e.type === "note_off") {
        soundingRef.current.delete(e.note);
        setSounding((prev) => {
          if (!prev.has(e.note)) return prev;
          const next = new Set(prev);
          next.delete(e.note);
          return next;
        });
      }
    });
    return () => {
      off();
    };
  }, []);

  // absNote → colour of the key that reaches it (key's colour, not the pitch's).
  const mappedColor = useMemo(() => {
    const m = new Map<string, string>();
    for (const [key, note] of Object.entries(KEYBOARD_NOTES)) {
      const abs = shiftOctave(note, octave);
      m.set(abs, keyColor(key));
    }
    return m;
  }, [octave]);

  // absNote → home-row key that reaches it.
  const mappedKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const [key, note] of Object.entries(KEYBOARD_NOTES)) {
      m.set(shiftOctave(note, octave), key);
    }
    return m;
  }, [octave]);
  const mappedKeyRef = useRef(mappedKey);
  mappedKeyRef.current = mappedKey;

  const press = async (absNote: string) => {
    if (held.current.has(absNote)) return;

    const key = mappedKeyRef.current.get(absNote);
    if (key) {
      // Already sounding from the physical keyboard: not our release to own.
      if (soundingRef.current.has(absNote)) return;
      held.current.set(absNote, { key });
      dispatchKey("keydown", key);
      return;
    }

    const raw =
      octaveRef.current === 0
        ? absNote
        : shiftOctave(absNote, -octaveRef.current);
    held.current.set(absNote, { raw });
    if (!audioRef.current.unlocked) await audioRef.current.unlock();
    // Released during the unlock.
    if (!held.current.has(absNote)) return;
    audioRef.current.engine?.noteOn(raw, 0.75);
  };

  const release = (absNote: string) => {
    const entry = held.current.get(absNote);
    if (!entry) return;
    held.current.delete(absNote);
    if ("key" in entry) dispatchKey("keyup", entry.key);
    else audioRef.current.engine?.noteOff(entry.raw);
  };

  // Engine outlives us; release on unmount.
  useEffect(() => {
    const heldMap = held.current;
    return () => {
      for (const entry of heldMap.values()) {
        if ("key" in entry) dispatchKey("keyup", entry.key);
        else audioRef.current.engine?.noteOff(entry.raw);
      }
      heldMap.clear();
    };
  }, []);

  // Glissando: the strip captures the pointer (per-key capture pins the drag).
  // pointerId → note; null = down but off the strip.
  const pointerNote = useRef(new Map<number, string | null>());

  const noteAt = (x: number, y: number): string | null =>
    document
      .elementFromPoint(x, y)
      ?.closest("[data-roll-note]")
      ?.getAttribute("data-roll-note") ?? null;

  const endPointer = (e: React.PointerEvent) => {
    const note = pointerNote.current.get(e.pointerId);
    pointerNote.current.delete(e.pointerId);
    if (note) release(note);
  };

  const stripHandlers = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      const note = noteAt(e.clientX, e.clientY);
      if (!note) return;
      // Throws if the pointer is already gone.
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      pointerNote.current.set(e.pointerId, note);
      void press(note);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointerNote.current.has(e.pointerId)) return;
      const prev = pointerNote.current.get(e.pointerId);
      const note = noteAt(e.clientX, e.clientY);
      if (note === prev) return;
      pointerNote.current.set(e.pointerId, note);
      if (prev) release(prev);
      if (note) void press(note);
    },
    onPointerUp: endPointer,
    onPointerCancel: endPointer,
    onLostPointerCapture: endPointer,
  };

  // Enter / Space for keyboard users.
  const keyHandlers = (note: string) => ({
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      if (e.repeat) return;
      void press(note);
    },
    onKeyUp: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") release(note);
    },
    onBlur: () => release(note),
  });

  return (
    <div>
      <div
        className="relative h-10 touch-none select-none rounded overflow-hidden"
        aria-label="Piano roll"
        {...stripHandlers}
      >
        {WHITES.map(({ note, whiteIndex }) => {
          const color = mappedColor.get(note);
          const lit = sounding.has(note);
          return (
            <button
              key={note}
              type="button"
              aria-label={`Play ${note}`}
              aria-pressed={lit}
              title={note}
              data-roll-note={note}
              {...keyHandlers(note)}
              // Hover: mapped keys take their colour, the rest go solid white.
              className="absolute top-0 h-full cursor-pointer bg-[var(--rest)] hover:bg-[var(--hover)] transition-[background-color,box-shadow] duration-100"
              style={
                {
                  left: `${whiteIndex * WHITE_W}%`,
                  width: `${WHITE_W}%`,
                  "--rest": "rgba(255,255,255,0.75)",
                  "--hover": color ?? "#ffffff",
                  backgroundColor: lit ? (color ?? "#ffffff") : undefined,
                  boxShadow: lit
                    ? `0 0 10px ${color ?? "#ffffff"}b0`
                    : undefined,
                  zIndex: lit ? 1 : undefined,
                } as React.CSSProperties
              }
            >
              {color && (
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1"
                  style={{ backgroundColor: color }}
                />
              )}
            </button>
          );
        })}
        {BLACKS.map(({ note, whiteIndex }) => {
          const color = mappedColor.get(note);
          const lit = sounding.has(note);
          return (
            <button
              key={note}
              type="button"
              aria-label={`Play ${note}`}
              aria-pressed={lit}
              title={note}
              data-roll-note={note}
              {...keyHandlers(note)}
              // Hover: mapped keys take their colour, the rest go solid black.
              className="absolute top-0 z-10 h-[57%] cursor-pointer bg-[var(--rest)] hover:bg-[var(--hover)] transition-[background-color,box-shadow] duration-100"
              style={
                {
                  left: `${(whiteIndex + 1) * WHITE_W - WHITE_W * 0.35}%`,
                  width: `${WHITE_W * 0.7}%`,
                  "--rest": "#14161a",
                  "--hover": color ?? "#000000",
                  backgroundColor: lit ? (color ?? "#ffffff") : undefined,
                  boxShadow: lit
                    ? `0 0 10px ${color ?? "#ffffff"}b0`
                    : undefined,
                } as React.CSSProperties
              }
            >
              {color && (
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1"
                  style={{ backgroundColor: color }}
                />
              )}
            </button>
          );
        })}
      </div>

      <OctaveControls octave={octave} />
    </div>
  );
}

// ── Octave shift ───────────────────────────────────────────────────────────

function OctaveControls({ octave }: { octave: number }) {
  const theme = useThemeStore((s) => s.theme);
  const setOctaveOffset = useSynthTweakStore((s) => s.setOctaveOffset);
  // Offset is relative to the preset's own octave.
  const base = resolveSettings(theme).octave;
  const bump = (delta: number) => setOctaveOffset(octave + delta - base);

  return (
    <div className="mt-1.5 flex items-stretch gap-1">
      <button
        type="button"
        aria-label="Octave down"
        disabled={octave <= OCTAVE_SHIFT_MIN}
        onClick={() => bump(-1)}
        className="flex-1 rounded bg-black/40 py-1 text-center text-sm text-white/60 transition enabled:cursor-pointer enabled:hover:bg-white/10 enabled:hover:text-white disabled:opacity-30"
      >
        −
      </button>
      <button
        type="button"
        aria-label="Octave up"
        disabled={octave >= OCTAVE_SHIFT_MAX}
        onClick={() => bump(1)}
        className="flex-1 rounded bg-black/40 py-1 text-center text-sm text-white/60 transition enabled:cursor-pointer enabled:hover:bg-white/10 enabled:hover:text-white disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
