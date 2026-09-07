/**
 * Home-row D Kurd handpan mapping (D Aeolian): `a` is the ding, the rest the
 * tone ring. A#3 (the Kurd's Bb) is written sharp so octave-shift parses it.
 */
export const KEYBOARD_NOTES: Record<string, string> = {
  a: "D3",
  s: "A3",
  d: "A#3",
  f: "C4",
  g: "D4",
  h: "E4",
  j: "F4",
  k: "G4",
  l: "A4",
  ";": "C5",
};

const NOTE_ORDER = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function shiftOctave(note: string, delta: number): string {
  const m = note.match(/^([A-G]#?)(-?\d+)$/);
  if (!m) return note;
  const [, pitch, oct] = m;
  const next = Math.max(0, Math.min(8, parseInt(oct, 10) + delta));
  if (!NOTE_ORDER.includes(pitch)) return note;
  return `${pitch}${next}`;
}

/** Should we ignore a keydown (e.g. user is typing in a form)? */
export function shouldIgnoreTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}
