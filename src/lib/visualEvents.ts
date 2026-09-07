// Audio-to-visual event bus. Per-frame values live in a mutable object
// so the render loop reads them without React updates.

export type NoteOnEvent = {
  type: "note_on";
  /** Sounding pitch after octave transpose ("D4"). */
  note: string;
  /** Key as named before transpose ("D3"); colour keys off this, not `note`. */
  sourceNote: string;
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
    } else if (e.type === "setting" && e.key === "reactivity") {
      visualState.reactivity = e.value;
    }
    for (const l of listeners) l(e);
  },
  on(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

/** Decay transients; dt in seconds. */
export function tickVisualState(dt: number) {
  visualState.noteImpulse = Math.max(0, visualState.noteImpulse - dt * 2.5);
  visualState.envelope = Math.max(0, visualState.envelope - dt * 1.2);
  visualState.pointerImpulse = Math.max(
    0,
    visualState.pointerImpulse - dt * 2.0,
  );
  visualState.clickImpulse = Math.max(0, visualState.clickImpulse - dt * 0.6);
}

export function bumpPointerImpulse(amount: number) {
  visualState.pointerImpulse = Math.min(
    1,
    visualState.pointerImpulse + amount,
  );
}

/** Click impulse at a -1..1 position. `strength` scales the response; impulse is also the wavefront clock. */
export function triggerClick(x: number, y: number, strength = 1) {
  visualState.clickPos[0] = x;
  visualState.clickPos[1] = y;
  visualState.clickImpulse = 1;
  visualState.clickStrength = strength;
}

// Set while the hero headline rolls: its own pulses plus a click stack wavefronts.
let pointerClicksLocked = false;

export function setPointerClicksLocked(locked: boolean) {
  pointerClicksLocked = locked;
}

export function arePointerClicksLocked() {
  return pointerClicksLocked;
}
