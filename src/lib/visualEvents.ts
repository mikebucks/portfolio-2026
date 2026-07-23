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
  pointer: [number, number]; // normalized -1..1, smoothed target
  pointerImpulse: number; // 0..1, decays — bumped by pointer velocity
  clickPos: [number, number]; // last click in normalized -1..1
  clickImpulse: number; // 0..1, decays — bumped on click
  clickStrength: number; // 0..1 scale on the click's visual response
  scroll: number; // 0..1 page progress
  noteImpulse: number; // 0..1, decays — bumped on note_on
  envelope: number; // 0..1 rough envelope follower
  frequency: number; // Hz of most recent note
  velocity: number; // 0..1 of most recent note
  filterCutoff: number; // normalized 0..1
  reactivity: number; // 0..1 user-controlled
};

export const visualState: VisualState = {
  pointer: [0, 0],
  pointerImpulse: 0,
  clickPos: [0, 0],
  clickImpulse: 0,
  clickStrength: 1,
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
  visualState.pointerImpulse = Math.max(
    0,
    visualState.pointerImpulse - dt * 2.0,
  );
  visualState.clickImpulse = Math.max(0, visualState.clickImpulse - dt * 0.6);
}

/** Bump from outside (e.g. pointer velocity, click) without going through the event bus. */
export function bumpPointerImpulse(amount: number) {
  visualState.pointerImpulse = Math.min(
    1,
    visualState.pointerImpulse + amount,
  );
}

/**
 * Fire a click impulse at a normalized (-1..1) screen position.
 *
 * `strength` scales how loudly the shader answers without touching the impulse,
 * which is also the wavefront's clock — themes derive the expanding radius from
 * its decay, so a quieter event has to arrive quiet rather than pre-expanded.
 * Notes use it to raise a gentler swell than a deliberate click.
 */
export function triggerClick(x: number, y: number, strength = 1) {
  visualState.clickPos[0] = x;
  visualState.clickPos[1] = y;
  visualState.clickImpulse = 1;
  visualState.clickStrength = strength;
}

// Set while the hero headline is rolling. The roll drives its own background
// pulses (CyclingWord calls triggerClick as each word lands), and a pointer
// click landing on top of those stacks a second wavefront into the first — the
// combination is what reads as too much. Only the pointer handler consults
// this; the headline's own pulses are deliberate and go straight through.
let pointerClicksLocked = false;

export function setPointerClicksLocked(locked: boolean) {
  pointerClicksLocked = locked;
}

export function arePointerClicksLocked() {
  return pointerClicksLocked;
}
