/**
 * Home-row chromatic mapping. Keys are lowercased on lookup so Shift still
 * works as an octave modifier without eating the note.
 */
export const KEYBOARD_NOTES: Record<string, string> = {
  a: "C4",
  s: "C#4",
  d: "D4",
  f: "D#4",
  g: "E4",
  h: "F4",
  j: "F#4",
  k: "G4",
  l: "G#4",
  ";": "A4",
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
