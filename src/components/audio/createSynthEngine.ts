import type * as ToneNS from "tone";
import type {
  FilterType,
  LfoShape,
  OscEngine,
  SynthSettings,
} from "@/lib/store";
import { registerWaveformSource } from "@/lib/audioScope";
import { visualBus } from "@/lib/visualEvents";
import { shiftOctave } from "./keyboardMapping";

export type SynthEngine = {
  noteOn: (note: string, velocity?: number) => void;
  noteOff: (note: string) => void;
  /** Release every sounding note and reset the filter envelope. Panic button. */
  releaseAll: () => void;
  applySettings: (s: SynthSettings) => void;
  dispose: () => void;
};

type Tone = typeof ToneNS;

type VoiceHandle = {
  triggerAttack: (note: string, time: number, velocity: number) => void;
  triggerRelease: (note: string, time: number) => void;
  releaseAll: () => void;
  apply: (s: SynthSettings) => void;
  output: ToneNS.ToneAudioNode;
  dispose: () => void;
  kind: OscEngine;
};

const FILTER_ENV_DEPTH_HZ = 5500;
const LFO_DEPTH_HZ = 2400;
const CYC_RES_DEPTH = 6;

/**
 * MicroFreak-inspired hybrid engine: digital oscillator section feeding an
 * analog-style filter, ADSR (VCA), filter envelope, LFO, and cycling
 * envelope. Modulation is computed manually each frame and written into the
 * shared filter — Tone's automatic LFO→Param routing has unit-coercion
 * quirks with frequency params and is brittle.
 *
 * Browser-only additions: a fixed "character" master chain — saturation,
 * chorus, stereo widener, EQ — plus stereo delay + a dark reverb tail.
 */
export function createSynthEngine(
  Tone: Tone,
  initial: SynthSettings,
): SynthEngine {
  // Play live, not sequenced: Tone's default 0.1s lookAhead schedules every
  // triggerAttack 100ms into the future, which reads as a laggy delay when the
  // keyboard is the instrument. Pull it down to a hair above zero so notes fire
  // almost immediately (well under the ~20ms perceptual threshold, on top of
  // the unavoidable hardware output latency).
  //
  // NOT exactly 0: on a just-resumed AudioContext (first keypress, or after a
  // suspend/resume on tab switch) a note scheduled at currentTime lands before
  // the context renders its first block and gets dropped — the swallowed
  // "first note". A few ms of headroom guarantees the note is always in the
  // future without any audible lag.
  Tone.getContext().lookAhead = 0.015;

  // Master chain, output → input:
  //   voice → filter → drive → chorus → delay → reverb → widener → eq → volume → limiter
  // The nodes between the filter and volume are always-on "character" — fixed,
  // preset-independent values that pull every sound out of raw-oscillator
  // "toy" territory: analog-ish saturation, chorus width, stereo spread, and a
  // darkened/bodied EQ. They intentionally read no SynthSettings fields so
  // presets never have to know about them.
  const limiter = new Tone.Limiter(-1).toDestination();
  const volume = new Tone.Volume(initial.masterVolume).connect(limiter);

  // Scope tap for the visual layer. Sits on the master so it sees the voice as
  // it is actually heard, character chain and all. 2048 samples is enough to
  // hold a full period of the lowest playable note at 48kHz.
  const scope = new Tone.Waveform(2048);
  volume.connect(scope);
  const releaseScope = registerWaveformSource({
    read: () => scope.getValue() as Float32Array,
    sampleRate: Tone.getContext().sampleRate,
  });

  // Gentle master EQ: a little low-end body, a touch of mud scooped, and the
  // top rolled off. Sitting last (after reverb) this also darkens the reverb
  // tail, so the wash reads as "haunting" rather than fizzy.
  const eq = new Tone.EQ3({
    low: 1.5,
    mid: -1,
    high: -2.5,
    lowFrequency: 250,
    highFrequency: 3200,
  }).connect(volume);

  // Stereo spread on the whole mix — 0.5 is neutral, higher is wider.
  const widener = new Tone.StereoWidener(0.7).connect(eq);

  // Longer, darker tail than the old 3.4s. preDelay pushes the wash back off
  // the transient so notes still speak clearly before they bloom.
  const reverb = new Tone.Reverb({
    decay: 5,
    preDelay: 0.03,
    wet: initial.reverbWet,
  }).connect(widener);
  void reverb.generate();

  const delay = new Tone.FeedbackDelay({
    delayTime: initial.delayTime,
    feedback: initial.delayFeedback,
    wet: initial.delayWet,
  }).connect(reverb);

  // Chorus is the biggest single anti-"toy" lever: it de-monos the pitched
  // voices and adds slow movement. Its LFO must be started explicitly.
  const chorus = new Tone.Chorus({
    frequency: 0.6,
    delayTime: 3.5,
    depth: 0.6,
    spread: 160,
    wet: 0.3,
  }).connect(delay);
  chorus.start();

  // Subtle soft-clip for harmonic "glue" / warmth. Kept low and pre-time-
  // effects so it thickens the dry tone without dirtying the reverb/delay tails.
  const drive = new Tone.Distortion({
    distortion: 0.1,
    oversample: "4x",
    wet: 0.18,
  }).connect(chorus);

  const filter = new Tone.Filter({
    frequency: initial.filterCutoff,
    Q: initial.filterResonance,
    type: initial.filterType,
    rolloff: -24,
  }).connect(drive);

  let voice: VoiceHandle = buildVoice(Tone, initial);
  voice.output.connect(filter);

  // ---- Modulation state (RAF-driven) -----------------------------------

  let current: SynthSettings = initial;

  // Filter envelope ADSR state machine
  type EnvStage = "idle" | "attack" | "decay" | "sustain" | "release";
  const fenv = { stage: "idle" as EnvStage, value: 0, releaseFrom: 0 };

  // Authoritative set of currently-sounding notes → their velocity. Drives the
  // filter-envelope release off real voice state (a lost noteOff can no longer
  // strand the filter open) and makes noteOn/noteOff idempotent. The stored
  // velocity lets a preset switch re-trigger held notes on the new voice.
  //
  // Contract: one active voice per pitch — a second noteOn for a pitch already
  // sounding is ignored. That matches the one-key-one-note keyboard. It is NOT
  // reference-counted, so it wouldn't correctly support multiple controllers
  // (on-screen keyboard / MIDI) playing the same pitch; that would need
  // per-pitch refcounts or source IDs.
  const active = new Map<string, number>();

  let lfoPhase = 0;
  let cycPhase = 0;
  let lastT = performance.now();
  let raf = 0;
  // The RAF only needs to run while its output can be heard. It self-suspends
  // when nothing audible remains (see isModActive / tick) and is woken by
  // noteOn or a tab becoming visible again.
  let loopActive = false;

  function tickFilterEnv(dt: number) {
    const { attack, decay, sustain } = current;
    const release = current.release;
    switch (fenv.stage) {
      case "attack": {
        const rate = 1 / Math.max(0.001, attack);
        fenv.value = Math.min(1, fenv.value + dt * rate);
        if (fenv.value >= 1) fenv.stage = "decay";
        break;
      }
      case "decay": {
        const rate = (1 - sustain) / Math.max(0.001, decay);
        fenv.value = Math.max(sustain, fenv.value - dt * rate);
        if (fenv.value <= sustain + 1e-4) {
          fenv.value = sustain;
          fenv.stage = "sustain";
        }
        break;
      }
      case "sustain": {
        // Track sustain in case it changes live.
        const target = sustain;
        fenv.value += (target - fenv.value) * Math.min(1, dt * 8);
        break;
      }
      case "release": {
        const rate = fenv.releaseFrom / Math.max(0.001, release);
        fenv.value = Math.max(0, fenv.value - dt * rate);
        if (fenv.value <= 1e-4) {
          fenv.value = 0;
          fenv.stage = "idle";
        }
        break;
      }
      case "idle":
      default:
        break;
    }
  }

  function lfoSample(phase: number, shape: LfoShape): number {
    const p = phase - Math.floor(phase); // 0..1
    switch (shape) {
      case "sine":
        return Math.sin(p * Math.PI * 2);
      case "triangle":
        return p < 0.5 ? p * 4 - 1 : 3 - p * 4;
      case "square":
        return p < 0.5 ? 1 : -1;
      case "sawtooth":
        return p * 2 - 1;
    }
  }

  // True while modulation can still shape audible sound: a note is held, or the
  // filter envelope is still releasing its tail. When neither holds, no signal
  // reaches the (non-self-oscillating) filter, so freezing modulation is
  // inaudible — the cue to suspend the loop.
  function isModActive() {
    return active.size > 0 || fenv.stage !== "idle";
  }

  // One modulation step. Split out of the RAF so noteOn can run it synchronously
  // and set the filter for the attack this instant, rather than waiting a frame
  // (the loop may have been suspended while idle). dt=0 is a valid "set now".
  function stepModulation(dt: number) {
    tickFilterEnv(dt);

    lfoPhase += dt * current.lfoRate;
    cycPhase += dt * current.cycEnvRate;

    const lfoVal = lfoSample(lfoPhase, current.lfoShape) * current.lfoAmount;
    const cycVal = Math.sin(cycPhase * Math.PI * 2) * current.cycEnvAmount;

    const cutoff =
      current.filterCutoff +
      fenv.value * current.filterEnvAmount * FILTER_ENV_DEPTH_HZ +
      lfoVal * LFO_DEPTH_HZ;
    const q = Math.max(0, current.filterResonance + cycVal * CYC_RES_DEPTH);

    // setTargetAtTime gives a smooth one-pole interpolation that hides the
    // RAF cadence and prevents zipper noise.
    const audioNow = Tone.now();
    filter.frequency.setTargetAtTime(
      Math.max(40, Math.min(18000, cutoff)),
      audioNow,
      0.008,
    );
    filter.Q.setTargetAtTime(q, audioNow, 0.008);
  }

  function tick() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    stepModulation(dt);

    // Suspend once nothing audible remains, or while the tab is hidden. noteOn
    // (or onVisibility) restarts the loop; the audio graph keeps its own tail
    // going without us — only the per-frame JS modulation stops.
    if (!isModActive() || document.hidden) {
      loopActive = false;
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (loopActive || document.hidden) return;
    loopActive = true;
    lastT = performance.now();
    raf = requestAnimationFrame(tick);
  }

  // Resume when the tab returns, if there's still something to modulate.
  const onVisibility = () => {
    if (!document.hidden && isModActive()) startLoop();
  };
  document.addEventListener("visibilitychange", onVisibility);

  // Seed the filter to its resting cutoff/Q so the first note lands correctly
  // without the loop having had to run yet.
  stepModulation(0);

  function rebuildIfEngineChanged(s: SynthSettings) {
    if (s.oscEngine === voice.kind) return;
    const old = voice;
    const next = buildVoice(Tone, s);
    next.output.connect(filter);
    voice = next;
    old.releaseAll();
    // The new voice never attacked the held notes; drop them and settle the
    // filter so the switch can't leave a phantom drone or stuck-open filter.
    active.clear();
    fenv.releaseFrom = fenv.value;
    fenv.stage = "release";
    setTimeout(() => old.dispose(), Math.max(80, s.release * 1000 + 80));
  }

  // Preset transpose. Applied at the engine boundary rather than in the
  // keyboard mapping so callers keep passing the untransposed name — as long as
  // noteOn and noteOff shift identically, `active` stays keyed consistently and
  // a release still finds its note.
  const transpose = (note: string) =>
    current.octave === 0 ? note : shiftOctave(note, current.octave);

  // What each held key actually sounded. Switching theme mid-note swaps
  // `current.octave` between the attack and the release, so re-deriving the
  // note at noteOff would look up a pitch that was never started and strand the
  // voice sounding forever.
  const sounding = new Map<string, string>();

  return {
    noteOn(rawNote, velocity = 0.8) {
      const note = transpose(rawNote);
      if (active.has(note)) return;
      active.set(note, velocity);
      sounding.set(rawNote, note);

      const t = Tone.now();
      voice.triggerAttack(note, t, velocity);

      // Retrigger the filter envelope on every note (including chord additions),
      // matching the prior articulation.
      fenv.stage = "attack";
      // Set the filter for this attack immediately, then (re)start the loop —
      // it may have been suspended while idle.
      stepModulation(0);
      startLoop();

      const freq = Tone.Frequency(note).toFrequency();
      visualBus.emit({
        type: "note_on",
        note,
        frequency: freq,
        velocity,
        timestamp: performance.now(),
      });
    },
    noteOff(rawNote) {
      const note = sounding.get(rawNote) ?? transpose(rawNote);
      sounding.delete(rawNote);
      if (!active.has(note)) return;
      active.delete(note);

      const t = Tone.now();
      voice.triggerRelease(note, t);

      if (active.size === 0) {
        fenv.releaseFrom = fenv.value;
        fenv.stage = "release";
      }

      visualBus.emit({
        type: "note_off",
        note,
        timestamp: performance.now(),
      });
    },
    releaseAll() {
      voice.releaseAll();
      active.clear();
      sounding.clear();
      fenv.releaseFrom = fenv.value;
      fenv.stage = "release";
    },
    applySettings(s) {
      rebuildIfEngineChanged(s);
      voice.apply(s);

      filter.type = s.filterType as FilterType;

      delay.wet.rampTo(s.delayWet, 0.05);
      delay.delayTime.rampTo(s.delayTime, 0.05);
      delay.feedback.rampTo(s.delayFeedback, 0.05);
      reverb.wet.rampTo(s.reverbWet, 0.1);
      volume.volume.rampTo(s.masterVolume, 0.05);

      current = s;

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
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      releaseScope();
      scope.dispose();
      voice.dispose();
      filter.dispose();
      drive.dispose();
      chorus.dispose();
      delay.dispose();
      reverb.dispose();
      widener.dispose();
      eq.dispose();
      volume.dispose();
      limiter.dispose();
    },
  };
}

// ---------- Voice builders ---------------------------------------------------

function buildVoice(Tone: Tone, s: SynthSettings): VoiceHandle {
  switch (s.oscEngine) {
    case "analog":
      return buildAnalog(Tone, s);
    case "super":
      return buildSuper(Tone, s);
    case "fm":
      return buildFM(Tone, s);
    case "harmonic":
      return buildHarmonic(Tone, s);
    case "karplus":
      return buildKarplus(Tone, s);
    case "noise":
      return buildNoise(Tone, s);
  }
}

function envOf(s: SynthSettings) {
  return {
    attack: s.attack,
    decay: s.decay,
    sustain: s.sustain,
    release: s.release,
  };
}

/** Pulse oscillator with adjustable width and detune — classic VA character. */
function buildAnalog(Tone: Tone, s: SynthSettings): VoiceHandle {
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: "pulse",
      width: 0.5 - s.oscWave * 0.45,
    } as ToneNS.OmniOscillatorOptions,
    envelope: envOf(s),
    portamento: s.glide,
    detune: s.oscTimbre * 30,
  });
  synth.maxPolyphony = 8;
  return {
    kind: "analog",
    output: synth,
    triggerAttack: (n, t, v) => synth.triggerAttack(n, t, v),
    triggerRelease: (n, t) => synth.triggerRelease(n, t),
    releaseAll: () => synth.releaseAll(),
    apply(next) {
      synth.set({
        oscillator: {
          type: "pulse",
          width: 0.5 - next.oscWave * 0.45,
        } as ToneNS.OmniOscillatorOptions,
        envelope: envOf(next),
        portamento: next.glide,
        detune: next.oscTimbre * 30,
      });
    },
    dispose: () => synth.dispose(),
  };
}

/** Stacked detuned saws — supersaw / "Super" wave. */
function buildSuper(Tone: Tone, s: SynthSettings): VoiceHandle {
  const count = Math.max(3, Math.round(3 + s.oscTimbre * 4));
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: "fatsawtooth",
      count,
      spread: s.oscWave * 80,
    } as ToneNS.OmniOscillatorOptions,
    envelope: envOf(s),
    portamento: s.glide,
  });
  synth.maxPolyphony = 6;
  return {
    kind: "super",
    output: synth,
    triggerAttack: (n, t, v) => synth.triggerAttack(n, t, v),
    triggerRelease: (n, t) => synth.triggerRelease(n, t),
    releaseAll: () => synth.releaseAll(),
    apply(next) {
      const c = Math.max(3, Math.round(3 + next.oscTimbre * 4));
      synth.set({
        oscillator: {
          type: "fatsawtooth",
          count: c,
          spread: next.oscWave * 80,
        } as ToneNS.OmniOscillatorOptions,
        envelope: envOf(next),
        portamento: next.glide,
      });
    },
    dispose: () => synth.dispose(),
  };
}

/** Two-operator FM — Wave morphs index, Timbre morphs harmonicity. */
function buildFM(Tone: Tone, s: SynthSettings): VoiceHandle {
  const synth = new Tone.PolySynth(Tone.FMSynth, {
    // Makeup gain: Tone's FMSynth outputs well below the subtractive engines
    // (super/analog), so at equal masterVolume it reads much quieter. Lift the
    // voice so presets are loudness-matched and masterVolume behaves the same
    // across engines. The master limiter (-1 dB) still catches peaks/chords.
    volume: 8,
    harmonicity: 0.5 + s.oscTimbre * 4,
    modulationIndex: 0.5 + s.oscWave * 18,
    envelope: envOf(s),
    modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 },
    portamento: s.glide,
  });
  synth.maxPolyphony = 6;
  return {
    kind: "fm",
    output: synth,
    triggerAttack: (n, t, v) => synth.triggerAttack(n, t, v),
    triggerRelease: (n, t) => synth.triggerRelease(n, t),
    releaseAll: () => synth.releaseAll(),
    apply(next) {
      synth.set({
        harmonicity: 0.5 + next.oscTimbre * 4,
        modulationIndex: 0.5 + next.oscWave * 18,
        envelope: envOf(next),
        portamento: next.glide,
      });
    },
    dispose: () => synth.dispose(),
  };
}

/** Additive-feel via custom partials — Wave = brightness, Timbre = odd/even. */
function buildHarmonic(Tone: Tone, s: SynthSettings): VoiceHandle {
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: "custom",
      partials: harmonicPartials(s.oscWave, s.oscTimbre),
    } as ToneNS.OmniOscillatorOptions,
    envelope: envOf(s),
    portamento: s.glide,
  });
  synth.maxPolyphony = 6;
  return {
    kind: "harmonic",
    output: synth,
    triggerAttack: (n, t, v) => synth.triggerAttack(n, t, v),
    triggerRelease: (n, t) => synth.triggerRelease(n, t),
    releaseAll: () => synth.releaseAll(),
    apply(next) {
      synth.set({
        oscillator: {
          type: "custom",
          partials: harmonicPartials(next.oscWave, next.oscTimbre),
        } as ToneNS.OmniOscillatorOptions,
        envelope: envOf(next),
        portamento: next.glide,
      });
    },
    dispose: () => synth.dispose(),
  };
}

function harmonicPartials(wave: number, timbre: number): number[] {
  const brightness = 0.4 + wave * 1.6;
  const oddBias = timbre;
  const out: number[] = [];
  for (let h = 1; h <= 10; h++) {
    const isOdd = h % 2 === 1;
    const oddWeight = isOdd ? 1 : 1 - oddBias;
    out.push((1 / Math.pow(h, brightness)) * oddWeight);
  }
  return out;
}

/**
 * Karplus-Strong pluck — Wave = resonance, Timbre = attack noise.
 *
 * PluckSynth isn't Monophonic, so it can't be wrapped by PolySynth. Round-
 * robin a small voice pool ourselves.
 */
function buildKarplus(Tone: Tone, s: SynthSettings): VoiceHandle {
  const VOICES = 6;
  const out = new Tone.Gain(0.7);
  const pool: ToneNS.PluckSynth[] = [];
  for (let i = 0; i < VOICES; i++) {
    const p = new Tone.PluckSynth({
      attackNoise: 0.2 + s.oscTimbre * 1.8,
      dampening: 1500 + (1 - s.oscWave) * 4500,
      resonance: 0.7 + s.oscWave * 0.28,
    });
    p.connect(out);
    pool.push(p);
  }
  let cursor = 0;
  const active = new Map<string, ToneNS.PluckSynth>();

  return {
    kind: "karplus",
    output: out,
    triggerAttack: (n, t) => {
      const v = pool[cursor];
      cursor = (cursor + 1) % VOICES;
      v.triggerAttack(n, t);
      active.set(n, v);
    },
    triggerRelease: (n, t) => {
      const v = active.get(n);
      if (v) {
        v.triggerRelease(t);
        active.delete(n);
      }
    },
    releaseAll: () => {
      for (const v of pool) v.triggerRelease();
      active.clear();
    },
    apply: (next) => {
      for (const v of pool) {
        v.attackNoise = 0.2 + next.oscTimbre * 1.8;
        v.dampening = 1500 + (1 - next.oscWave) * 4500;
        v.resonance = 0.7 + next.oscWave * 0.28;
      }
    },
    dispose: () => {
      for (const v of pool) v.dispose();
      out.dispose();
    },
  };
}

/**
 * Filtered noise. Mono — noise has no pitch, but the global filter shapes it
 * and the keyboard still gives the player rhythmic control.
 */
function buildNoise(Tone: Tone, s: SynthSettings): VoiceHandle {
  const noise = new Tone.NoiseSynth({
    noise: { type: noiseType(s.oscWave) },
    envelope: envOf(s),
  });
  const out = new Tone.Gain(1);
  noise.connect(out);

  const active = new Set<string>();
  return {
    kind: "noise",
    output: out,
    triggerAttack: (n, t, v) => {
      active.add(n);
      noise.triggerAttack(t, v);
    },
    triggerRelease: (n, t) => {
      if (!active.has(n)) return;
      active.delete(n);
      if (active.size === 0) noise.triggerRelease(t);
    },
    releaseAll: () => {
      active.clear();
      noise.triggerRelease();
    },
    apply: (next) => {
      noise.set({
        noise: { type: noiseType(next.oscWave) },
        envelope: envOf(next),
      });
    },
    dispose: () => {
      noise.dispose();
      out.dispose();
    },
  };
}

function noiseType(wave: number): "white" | "pink" | "brown" {
  if (wave < 0.34) return "brown";
  if (wave < 0.67) return "pink";
  return "white";
}
