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
 * A slim piano strip spanning the synth's whole reachable register (C1–C7),
 * plus the octave shift controls. Deliberately small — it's an indicator you
 * can also play, not the main keyboard.
 *
 * The keys the home row currently reaches each wear a bar of their palette
 * colour across the bottom edge — like tape strips on a practice keyboard —
 * and that band slides as the octave moves, so the roll *is* the octave
 * indicator. Any key — marked or not — plays its exact written pitch on click.
 *
 * Playing takes one of two routes. A *mapped* note — one the home row
 * currently reaches — is played by dispatching the synthetic key events the
 * caps themselves use, so it walks the exact physical-press path: the engine
 * wiring sounds it, and the matching cap above lights up. An unmapped note has
 * no key to speak through, so it goes to the engine directly; the engine
 * transposes every incoming note by the active octave, so this component
 * un-shifts first and remembers what it sent per pressed key — the octave can
 * change between press and release, and the release must name the note that
 * actually started.
 *
 * Lit state comes from the visualBus, which carries the engine's post-transpose
 * pitch — so a physical keypress lights the same roll key its sound occupies,
 * and Shift/Alt one-octave holds light where they really play.
 */

// C1 .. C7: six full octaves of white keys plus the closing C.
const LOW_OCT = 1;
const WHITE_PITCHES = ["C", "D", "E", "F", "G", "A", "B"] as const;
// The sharp that sits after each white key, if any.
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

  // The attach-once pointer handlers and the async unlock path read these
  // through refs — same reasoning as useSynthControls: a press must not close
  // over the values that were current when it started.
  const audioRef = useRef(audio);
  const octaveRef = useRef(octave);
  audioRef.current = audio;
  octaveRef.current = octave;

  // Absolute pitch pressed on the roll → how to let go of it: the home-row key
  // whose keyup to dispatch, or the untransposed note to hand the engine. The
  // release route must be the press's, remembered — the octave can move
  // mid-hold and change which route a pitch *would* take.
  const held = useRef(new Map<string, { key: string } | { raw: string }>());

  // Every pitch currently sounding, in the engine's own (absolute) terms. The
  // ref is the same set kept synchronously — press() consults it mid-gesture,
  // before React has committed the state.
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

  // Where the home row currently lands, and in what colour. The colour is the
  // *key's* — keyColor(key), the same lookup the caps use — not the sounding
  // pitch's: a pitch-based lookup goes wrong the moment the octave shift parks
  // one key on another key's home note (`a` shifted up an octave sounds D4,
  // which is g's own note, and the ding's dot would turn violet).
  const mappedColor = useMemo(() => {
    const m = new Map<string, string>();
    for (const [key, note] of Object.entries(KEYBOARD_NOTES)) {
      const abs = shiftOctave(note, octave);
      m.set(abs, keyColor(key));
    }
    return m;
  }, [octave]);

  // absNote → the home-row key that reaches it under the current octave. Read
  // through a ref for the same reason as the octave: a glissando's handlers
  // outlive the render they were created in.
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
      // Already sounding from the physical keyboard: don't take ownership of a
      // release that isn't ours — same rule as the caps.
      if (soundingRef.current.has(absNote)) return;
      held.current.set(absNote, { key });
      // The keydown path unlocks the audio graph itself (useSynthControls),
      // so no unlock dance is needed here.
      dispatchKey("keydown", key);
      return;
    }

    const raw =
      octaveRef.current === 0
        ? absNote
        : shiftOctave(absNote, -octaveRef.current);
    held.current.set(absNote, { raw });
    // Opening the panel already unlocks, but the roll shouldn't depend on
    // where it's mounted — unlock on first press like the key caps' path does.
    if (!audioRef.current.unlocked) await audioRef.current.unlock();
    // Released while the unlock was in flight: its release already ran.
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

  // Unmounting mid-press must not strand a note — the engine lives above us.
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

  // ── Pointer → glissando ──────────────────────────────────────────────────
  // The strip, not the key, owns the pointer: capturing on the pressed button
  // (the obvious per-key approach) pins every later event to that key, so a
  // drag can never reach its neighbours. Instead the container captures, and
  // each move hit-tests what's under the cursor — swapping notes as it crosses
  // key boundaries, like dragging a finger across a real keyboard. Hit-testing
  // via elementFromPoint rather than arithmetic keeps one source of truth: the
  // rendered keys, black-over-white stacking included.
  //
  // Keyed by pointerId so a second finger runs its own independent glissando.
  // `null` means "down, but currently off the strip" — the note mutes, and the
  // entry stays so sliding back on resumes.
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
      // Capture can throw if the pointer is already gone (a pen lifting in the
      // same frame); the press should still land.
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

  // Enter / Space on a focused key still plays it — the pointer story above is
  // no help to a keyboard user tabbing through the strip.
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
              className="absolute top-0 h-full cursor-pointer transition-[background-color,box-shadow] duration-100"
              style={{
                left: `${whiteIndex * WHITE_W}%`,
                width: `${WHITE_W}%`,
                // At rest every key is plain ivory; a mapped key is marked by
                // its bottom bar, not a tint. Struck, it floods with its colour.
                backgroundColor: lit
                  ? (color ?? "#ffffff")
                  : "rgba(255,255,255,0.45)",
                boxShadow: lit
                  ? `0 0 10px ${color ?? "#ffffff"}b0`
                  : undefined,
                zIndex: lit ? 1 : undefined,
              }}
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
              className="absolute top-0 z-10 h-[57%] cursor-pointer transition-[background-color,box-shadow] duration-100"
              style={{
                left: `${(whiteIndex + 1) * WHITE_W - WHITE_W * 0.35}%`,
                width: `${WHITE_W * 0.7}%`,
                backgroundColor: lit ? (color ?? "#ffffff") : "#14161a",
                boxShadow: lit
                  ? `0 0 10px ${color ?? "#ffffff"}b0`
                  : undefined,
              }}
            >
              {/* The one mapped black key (A#) carries a light palette colour
                  by design (see NOTE_PALETTE), so its bar reads on the dark
                  key without any helper ring. */}
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
  // The offset is stored relative to the preset's own register, so moving one
  // effective octave means solving for the offset that lands there.
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
