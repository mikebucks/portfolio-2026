/**
 * Captures one cycle of the synth's output for the visual layer. Resamples
 * exactly one period (the buffer holds a fractional count), starting at a
 * rising zero crossing like a scope trigger. The shape is retained between
 * captures so silence doesn't flatten it.
 */

/** Samples in the shape handed to the GPU. */
export const WAVE_SIZE = 256;

export type WaveformSource = {
  /** Time-domain samples, -1..1. Must be at least a few periods long. */
  read: () => Float32Array;
  sampleRate: number;
};

let source: WaveformSource | null = null;

// Seeded with a sine so the visuals are correct before any note has sounded.
const shape = new Float32Array(WAVE_SIZE);
for (let i = 0; i < WAVE_SIZE; i++) {
  shape[i] = Math.sin((i / WAVE_SIZE) * Math.PI * 2);
}

// Working buffers for a single capture.
const raw = new Float32Array(WAVE_SIZE);
const smooth = new Float32Array(WAVE_SIZE);

// Partials kept. More reads as jagged wiggle; five keeps the contour that
// tells voices apart.
const HARMONICS = 5;

// Partials' level relative to the fundamental; 0 gives a plain sine.
const CHARACTER = 0.4;

// Basis tables, built once.
const COS = new Float32Array(HARMONICS * WAVE_SIZE);
const SIN = new Float32Array(HARMONICS * WAVE_SIZE);
for (let k = 1; k <= HARMONICS; k++) {
  for (let j = 0; j < WAVE_SIZE; j++) {
    const th = (2 * Math.PI * k * j) / WAVE_SIZE;
    COS[(k - 1) * WAVE_SIZE + j] = Math.cos(th);
    SIN[(k - 1) * WAVE_SIZE + j] = Math.sin(th);
  }
}
const reA = new Float32Array(HARMONICS);
const reB = new Float32Array(HARMONICS);

export function registerWaveformSource(s: WaveformSource) {
  source = s;
  return () => {
    if (source === s) source = null;
  };
}

/** The retained cycle, normalized to ±1. Amplitude is the caller's business. */
export function waveformShape(): Float32Array {
  return shape;
}

/** Pull a fresh cycle at `frequency` Hz. False (shape untouched) when nothing is audible. */
export function captureWaveform(frequency: number): boolean {
  if (!source) return false;

  const buf = source.read();
  const n = buf.length;
  if (n < 16) return false;

  let sum = 0;
  for (let i = 0; i < n; i++) sum += buf[i] * buf[i];
  // Gate above the noise floor: a reverb tail at another pitch reads as spikes.
  if (Math.sqrt(sum / n) < 0.015) return false;

  // Clamped so a low note can't ask for more samples than the buffer holds.
  const period = frequency > 0 ? source.sampleRate / frequency : n / 4;
  const span = Math.min(Math.max(period, 8), n - 2);

  // Trigger on a rising zero crossing with a full period ahead; the 0
  // fallback just rotates the shape.
  let start = 0;
  const limit = Math.max(1, Math.floor(n - span - 1));
  for (let i = 0; i < limit; i++) {
    if (buf[i] <= 0 && buf[i + 1] > 0) {
      start = i;
      break;
    }
  }

  for (let j = 0; j < WAVE_SIZE; j++) {
    const pos = start + (j / WAVE_SIZE) * span;
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    raw[j] = buf[i0] * (1 - frac) + buf[Math.min(i0 + 1, n - 1)] * frac;
  }

  // Rebuild from a few partials (a box blur left it jagged); also drops DC.
  for (let k = 0; k < HARMONICS; k++) {
    let a = 0;
    let b = 0;
    const off = k * WAVE_SIZE;
    for (let j = 0; j < WAVE_SIZE; j++) {
      a += raw[j] * COS[off + j];
      b += raw[j] * SIN[off + j];
    }
    reA[k] = (a * 2) / WAVE_SIZE;
    reB[k] = (b * 2) / WAVE_SIZE;
  }

  // Pin the fundamental to unit magnitude so the wave swings once per period;
  // the partials survive as skew and shoulders.
  const f0 = Math.hypot(reA[0], reB[0]);
  const norm = f0 > 1e-6 ? 1 / f0 : 0;
  for (let k = 0; k < HARMONICS; k++) {
    const w = k === 0 ? 1 : CHARACTER / (k + 1);
    reA[k] *= norm * w;
    reB[k] *= norm * w;
  }

  // Phase-lock to the fundamental: the trigger is off by a sample or two per
  // capture, and easing between phase-mismatched cycles averages toward flat.
  const phi = Math.atan2(reA[0], reB[0]);
  let shift = -Math.round((phi * WAVE_SIZE) / (2 * Math.PI));
  shift = ((shift % WAVE_SIZE) + WAVE_SIZE) % WAVE_SIZE;

  let peak = 1e-6;
  for (let j = 0; j < WAVE_SIZE; j++) {
    const s = (j + shift) % WAVE_SIZE;
    let v = 0;
    for (let k = 0; k < HARMONICS; k++) {
      const off = k * WAVE_SIZE;
      v += reA[k] * COS[off + s] + reB[k] * SIN[off + s];
    }
    smooth[j] = v;
    const m = Math.abs(v);
    if (m > peak) peak = m;
  }

  // Peak-normalize; safe now the curve is band-limited.
  const scale = 1 / peak;

  // Ease into the retained shape; captures disagree frame to frame.
  for (let j = 0; j < WAVE_SIZE; j++) {
    shape[j] += (smooth[j] * scale - shape[j]) * 0.18;
  }

  return true;
}
