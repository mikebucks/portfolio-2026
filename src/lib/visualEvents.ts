/**
 * Tiny event bus connecting the audio system to the visual layer.
 * High-frequency values live in a mutable ref-like object so the render
 * loop can read them without triggering React updates.
 */

export type NoteOnEvent = {
  type: "note_on";
  note: string;
  frequency: number;
  velocity: number; // 0..1
  timestamp: number;
};

export type NoteOffEvent = {
  type: "note_off";
  note: string;
  timestamp: number;
};

export type SettingEvent = {
  type: "setting";
  key: string;
  value: number;
};

export type VisualEvent = NoteOnEvent | NoteOffEvent | SettingEvent;

type Listener = (e: VisualEvent) => void;

/** Shared store of values the render loop reads each frame. */
export type VisualState = {
  pointer: [number, number]; // normalized -1..1
  scroll: number; // 0..1 page progress
  noteImpulse: number; // decays each frame, bumped on note_on
  envelope: number; // 0..1 rough envelope follower
  frequency: number; // Hz of most recent note
  velocity: number; // 0..1 of most recent note
  filterCutoff: number; // normalized 0..1
  reactivity: number; // 0..1 user-controlled
};

export const visualState: VisualState = {
  pointer: [0, 0],
  scroll: 0,
  noteImpulse: 0,
  envelope: 0,
  frequency: 0,
  velocity: 0,
  filterCutoff: 0.6,
  reactivity: 0.7,
};

const listeners = new Set<Listener>();

export const visualBus = {
  emit(e: VisualEvent) {
    if (e.type === "note_on") {
      visualState.noteImpulse = 1;
      visualState.envelope = Math.max(visualState.envelope, e.velocity);
      visualState.frequency = e.frequency;
      visualState.velocity = e.velocity;
    } else if (e.type === "setting") {
      if (e.key === "filterCutoff") visualState.filterCutoff = e.value;
      if (e.key === "reactivity") visualState.reactivity = e.value;
    }
    for (const l of listeners) l(e);
  },
  on(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

/** Call from RAF to decay transient values. */
export function tickVisualState(dt: number) {
  // dt in seconds
  visualState.noteImpulse = Math.max(0, visualState.noteImpulse - dt * 2.5);
  visualState.envelope = Math.max(0, visualState.envelope - dt * 1.2);
}
