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
  /** Panic: release every note, reset the filter envelope. */
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
 * Hybrid engine: oscillator voice → shared filter → fixed "character" chain.
 * Modulation (filter env, LFO, cycling env) is stepped per frame in JS;
 * Tone's LFO→Param routing is brittle with frequency params.
 */
export function createSynthEngine(
  Tone: Tone,
  initial: SynthSettings,
): SynthEngine {
  // Default 0.1s lookAhead feels laggy live. Not 0: a note scheduled at
  // currentTime on a just-resumed context gets dropped.
  Tone.getContext().lookAhead = 0.015;

  // Chain: voice → filter → drive → chorus → delay → reverb → widener → eq → volume → limiter.
  // drive..eq are fixed "character", deliberately preset-independent.
  const limiter = new Tone.Limiter(-1).toDestination();
  const volume = new Tone.Volume(initial.masterVolume).connect(limiter);

  // Scope tap on the master. 2048 samples holds a period of the lowest note at 48kHz.
  const scope = new Tone.Waveform(2048);
  volume.connect(scope);
  const releaseScope = registerWaveformSource({
    read: () => scope.getValue() as Float32Array,
    sampleRate: Tone.getContext().sampleRate,
  });

  // Last in chain so it darkens the reverb tail too.
  const eq = new Tone.EQ3({
    low: 1.5,
    mid: -1,
    high: -2.5,
    lowFrequency: 250,
    highFrequency: 3200,
  }).connect(volume);

  // 0.5 is neutral.
  const widener = new Tone.StereoWidener(0.7).connect(eq);

  // preDelay keeps the transient clear before the wash.
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

  // Chorus LFO must be started explicitly.
  const chorus = new Tone.Chorus({
    frequency: 0.6,
    delayTime: 3.5,
    depth: 0.6,
    spread: 160,
    wet: 0.3,
  }).connect(delay);
  chorus.start();

  // Pre-time-effects so it doesn't dirty the delay/reverb tails.
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

  type EnvStage = "idle" | "attack" | "decay" | "sustain" | "release";
  const fenv = { stage: "idle" as EnvStage, value: 0, releaseFrom: 0 };

  // Sounding note → velocity. One voice per pitch, not refcounted.
  const active = new Map<string, number>();

  let lfoPhase = 0;
  let cycPhase = 0;
  let lastT = performance.now();
  let raf = 0;
  // Loop self-suspends when inaudible; noteOn / visibility wake it.
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

  function isModActive() {
    return active.size > 0 || fenv.stage !== "idle";
  }

  // dt=0 is a valid "set now"; noteOn uses it.
  function stepModulation(dt: number) {
    tickFilterEnv(dt);

    lfoPhase += dt * current.lfoRate;
    cycPhase += dt * current.cycEnvRate;

    const lfoVal = lfoSample(lfoPhase, current.lfoShape) * current.lfoAmount;
    const cycVal = Math.sin(cycPhase * Math.PI * 2) * current.cycEnvAmount;

    // Absolute-Hz mod depths would hold a low cutoff open; scale them down under 600 Hz.
    const modScale = Math.min(1, current.filterCutoff / 600);
    const cutoff =
      current.filterCutoff +
      (fenv.value * current.filterEnvAmount * FILTER_ENV_DEPTH_HZ +
        lfoVal * LFO_DEPTH_HZ) *
        modScale;
    const q = Math.max(0, current.filterResonance + cycVal * CYC_RES_DEPTH);

    // setTargetAtTime smooths the RAF cadence; avoids zipper noise.
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

  const onVisibility = () => {
    if (!document.hidden && isModActive()) startLoop();
  };
  document.addEventListener("visibilitychange", onVisibility);

  // Seed the filter before the loop has run.
  stepModulation(0);

  function rebuildIfEngineChanged(s: SynthSettings) {
    if (s.oscEngine === voice.kind) return;
    const old = voice;
    const next = buildVoice(Tone, s);
    next.output.connect(filter);
    voice = next;
    old.releaseAll();
    // New voice never attacked the held notes; drop them.
    active.clear();
    fenv.releaseFrom = fenv.value;
    fenv.stage = "release";
    setTimeout(() => old.dispose(), Math.max(80, s.release * 1000 + 80));
  }

  // Preset transpose; callers pass untransposed notes.
  const transpose = (note: string) =>
    current.octave === 0 ? note : shiftOctave(note, current.octave);

  // rawNote → note actually sounded. Octave can change mid-hold.
  const sounding = new Map<string, string>();

  return {
    noteOn(rawNote, velocity = 0.8) {
      const note = transpose(rawNote);
      if (active.has(note)) return;
      active.set(note, velocity);
      sounding.set(rawNote, note);

      const t = Tone.now();
      voice.triggerAttack(note, t, velocity);

      fenv.stage = "attack";
      stepModulation(0);
      startLoop();

      const freq = Tone.Frequency(note).toFrequency();
      visualBus.emit({
        type: "note_on",
        note,
        sourceNote: rawNote,
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

/** Pulse osc — Wave = width, Timbre = detune. */
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

/** Supersaw — Wave = spread, Timbre = count. */
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
    // Makeup gain: FMSynth is much quieter than the subtractive engines.
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
 * PluckSynth isn't Monophonic, so PolySynth can't wrap it; round-robin a pool.
 * attackNoise in note periods: under ~2 the random noise offset makes level vary.
 */
const karplusAttackNoise = (timbre: number) => 0.3 + timbre * 5.7;
function buildKarplus(Tone: Tone, s: SynthSettings): VoiceHandle {
  const VOICES = 6;
  // Makeup gain: PluckSynth sits ~10 dB under the subtractive engines.
  const out = new Tone.Gain(2.0);

  // Subsonic trap: the comb's DC ringing is inaudible but ducks the limiter.
  // 30 Hz, 4th order: ~1 dB at D1, the lowest note.
  const hp = new Tone.Filter({
    type: "highpass",
    frequency: 30,
    rolloff: -24,
  }).connect(out);

  const pool: ToneNS.PluckSynth[] = [];
  for (let i = 0; i < VOICES; i++) {
    const p = new Tone.PluckSynth({
      attackNoise: karplusAttackNoise(s.oscTimbre),
      dampening: 1500 + (1 - s.oscWave) * 4500,
      resonance: 0.7 + s.oscWave * 0.28,
    });
    p.connect(hp);
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
        v.attackNoise = karplusAttackNoise(next.oscTimbre);
        v.dampening = 1500 + (1 - next.oscWave) * 4500;
        v.resonance = 0.7 + next.oscWave * 0.28;
      }
    },
    dispose: () => {
      for (const v of pool) v.dispose();
      hp.dispose();
      out.dispose();
    },
  };
}

/** Mono noise; keys only gate it. */
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
