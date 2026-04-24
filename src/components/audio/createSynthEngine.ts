import type * as ToneNS from "tone";
import type { SynthSettings } from "@/lib/store";
import { visualBus } from "@/lib/visualEvents";

export type SynthEngine = {
  noteOn: (note: string, velocity?: number) => void;
  noteOff: (note: string) => void;
  applySettings: (s: SynthSettings) => void;
  dispose: () => void;
};

/**
 * Build the synth graph. Tone.js is passed in rather than imported at module
 * top so callers can lazy-load it after a user gesture.
 */
export function createSynthEngine(
  Tone: typeof ToneNS,
  initial: SynthSettings,
): SynthEngine {
  const limiter = new Tone.Limiter(-1).toDestination();
  const volume = new Tone.Volume(initial.masterVolume).connect(limiter);
  const reverb = new Tone.Reverb({ decay: 2.4, wet: initial.reverbWet }).connect(
    volume,
  );
  const delay = new Tone.FeedbackDelay({
    delayTime: initial.delayTime,
    feedback: initial.delayFeedback,
    wet: initial.delayWet,
  }).connect(reverb);
  const filter = new Tone.Filter({
    frequency: initial.filterCutoff,
    Q: initial.filterResonance,
    type: "lowpass",
  }).connect(delay);

  const poly = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: initial.oscillatorType },
    envelope: {
      attack: initial.attack,
      decay: initial.decay,
      sustain: initial.sustain,
      release: initial.release,
    },
  }).connect(filter);

  poly.maxPolyphony = 8;

  return {
    noteOn(note, velocity = 0.8) {
      poly.triggerAttack(note, Tone.now(), velocity);
      const freq = Tone.Frequency(note).toFrequency();
      visualBus.emit({
        type: "note_on",
        note,
        frequency: freq,
        velocity,
        timestamp: performance.now(),
      });
    },
    noteOff(note) {
      poly.triggerRelease(note, Tone.now());
      visualBus.emit({
        type: "note_off",
        note,
        timestamp: performance.now(),
      });
    },
    applySettings(s) {
      poly.set({
        oscillator: { type: s.oscillatorType },
        envelope: {
          attack: s.attack,
          decay: s.decay,
          sustain: s.sustain,
          release: s.release,
        },
      });
      filter.frequency.rampTo(s.filterCutoff, 0.05);
      filter.Q.rampTo(s.filterResonance, 0.05);
      delay.wet.rampTo(s.delayWet, 0.05);
      delay.delayTime.rampTo(s.delayTime, 0.05);
      delay.feedback.rampTo(s.delayFeedback, 0.05);
      reverb.wet.rampTo(s.reverbWet, 0.1);
      volume.volume.rampTo(s.masterVolume, 0.05);
      visualBus.emit({
        type: "setting",
        key: "filterCutoff",
        value: Math.min(1, s.filterCutoff / 8000),
      });
      visualBus.emit({
        type: "setting",
        key: "reactivity",
        value: s.visualReactivity,
      });
    },
    dispose() {
      poly.dispose();
      filter.dispose();
      delay.dispose();
      reverb.dispose();
      volume.dispose();
      limiter.dispose();
    },
  };
}
