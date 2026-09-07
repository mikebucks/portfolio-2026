import { KEYBOARD_NOTES } from "@/components/audio/keyboardMapping";

/**
 * One colour per playable key, shared by the caps and the shaders (compiled
 * into `noteHue()` by themes/palette.ts). Home-row order, low to high; the
 * last entry is the ramp tail past the top key. Written in the shaders' raw
 * (no sRGB conversion) space so cap and shader land on the same hex.
 */
export const NOTE_PALETTE = [
  "#FD7220", // a · D3  — the ding
  "#1B7F9E", // s · A3
  "#E8C34A", // d · A#3 — light: the roll's one black key, its dot must read
  "#4FB0C6", // f · C4
  "#7A4FB5", // g · D4
  "#2FA35A", // h · E4
  "#C9A227", // j · F4
  "#D64550", // k · G4
  "#5C6672", // l · A4
  "#2E4E8F", // ; · C5
  "#0F3D3E", // (no key) ramp tail
] as const;

/** Position of a palette entry on the 0..1 axis `noteHue()` ramps along. */
export function paletteNorm(index: number): number {
  return index / (NOTE_PALETTE.length - 1);
}

const SEMITONES: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3,
  E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8,
  Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

/** "A#3" → 58. Null for anything that isn't a pitch + octave. */
export function noteToMidi(note: string): number | null {
  const m = note.match(/^([A-G][b#]?)(-?\d+)$/);
  if (!m) return null;
  const semi = SEMITONES[m[1]];
  if (semi === undefined) return null;
  return (parseInt(m[2], 10) + 1) * 12 + semi;
}

/** The playable keys in home-row order, which is also palette order. */
export const PALETTE_KEYS = Object.keys(KEYBOARD_NOTES);

// Built from the mapping so the two can't drift; mapped notes are distinct.
const INDEX_BY_MIDI = new Map<number, number>(
  PALETTE_KEYS.map((k, i) => [noteToMidi(KEYBOARD_NOTES[k])!, i] as const),
);

/**
 * Palette index for a sounding note. Octaves fold onto the nearest mapped note
 * of the same pitch class, so transposed pitches keep a colour; off-scale
 * pitches fall back by pitch class.
 */
export function noteColorIndex(note: string): number {
  const midi = noteToMidi(note);
  if (midi === null) return 0;
  for (let oct = 0; oct <= 5; oct++) {
    for (const delta of oct === 0 ? [0] : [-12 * oct, 12 * oct]) {
      const hit = INDEX_BY_MIDI.get(midi + delta);
      if (hit !== undefined) return hit;
    }
  }
  return (midi % 12) % NOTE_PALETTE.length;
}

/** Where a sounding note sits on the `noteHue()` ramp — the shader uniform. */
export function noteColorNorm(note: string): number {
  return paletteNorm(noteColorIndex(note));
}

/** The colour a key plays in, for the caps. */
export function keyColor(key: string): string {
  const note = KEYBOARD_NOTES[key.toLowerCase()];
  return note ? NOTE_PALETTE[noteColorIndex(note)] : NOTE_PALETTE[0];
}

/** "#FD7220" → [0.992, 0.447, 0.125], the form the shaders want. */
export function hexToRgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [
    ((n >> 16) & 255) / 255,
    ((n >> 8) & 255) / 255,
    (n & 255) / 255,
  ];
}
