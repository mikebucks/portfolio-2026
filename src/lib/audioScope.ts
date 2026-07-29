/**
 * Captures a single cycle of the synth's own output so the visual layer can
 * draw the actual voice instead of a stand-in sine.
 *
 * Two problems have to be solved before an analyser buffer is usable as a
 * repeating shape:
 *
 *   1. The buffer is a fixed time window, so it holds a fractional number of
 *      cycles. Tiling it would put a step discontinuity at every seam. We know
 *      the sounding frequency, so we resample exactly one period out of it.
 *   2. The window is not phase-locked to the waveform, so the shape slides
 *      sideways every frame. We start the resample at a rising zero crossing,
 *      which is what an oscilloscope's trigger does.
 *
 * The captured shape is retained between captures: silence must not overwrite
 * it, or the effect would flatten the instant a note releases. That retention
 * is also what lets clicks and pointer motion reuse the shape — they drive its
 * amplitude without producing any audio of their own.
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

/**
 * Partials kept when rebuilding a captured cycle. A saw through a resonant
 * filter carries hundreds, and drawn as a displaced line they are a jagged mess
 * at any amplitude — the eye reads the wiggle, not the wave. Five keeps the
 * gross contour that actually distinguishes one voice from another and throws
 * away everything a line cannot show.
 */
const HARMONICS = 5;

/**
 * How loud the partials sit relative to the fundamental after re-balancing.
 * Turn it up for more of the voice's character and a busier line; down toward
 * 0 for a plain sine that ignores what is playing.
 */
const CHARACTER = 0.4;

// Basis tables for the analysis/synthesis passes, built once. A naive DFT would
// call sin/cos ~5k times per captured frame for no reason — the angles are
// fixed by WAVE_SIZE.
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

/**
 * Pull a fresh cycle from the source. Returns false and leaves the retained
 * shape untouched when there is nothing audible to capture.
 *
 * `frequency` is the Hz of the most recent note — it sets the period to slice.
 */
export function captureWaveform(frequency: number): boolean {
  if (!source) return false;

  const buf = source.read();
  const n = buf.length;
  if (n < 16) return false;

  let sum = 0;
  for (let i = 0; i < n; i++) sum += buf[i] * buf[i];
  // Gated well above the noise floor. A decaying reverb tail is at a different
  // pitch from the frequency we are about to slice by, so capturing it yields
  // an aperiodic chunk that reads as spikes rather than as a waveform.
  if (Math.sqrt(sum / n) < 0.015) return false;

  // One period, clamped so a very low note or a missing frequency can't ask
  // for more samples than the buffer holds.
  const period = frequency > 0 ? source.sampleRate / frequency : n / 4;
  const span = Math.min(Math.max(period, 8), n - 2);

  // Trigger on the first rising zero crossing that still leaves a full period
  // ahead of it. Falling back to 0 is fine — worst case the shape is rotated.
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

  // Rebuild from the first few partials only. A box blur was not enough here:
  // it attenuates the top of the spectrum but leaves plenty behind, so the
  // captured wave still read as jagged next to the resting sine. Reconstructing
  // from a fixed, small harmonic count guarantees a smooth curve of a known
  // complexity no matter how filthy the source is, and it drops DC along the
  // way so the wave can't sit off-centre.
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

  // Re-balance around the fundamental. Band-limiting alone was not enough: a
  // wave built from five partials at their captured strengths still swings up
  // to five times per period where the resting sine swings once, so it reads as
  // a different animal however smooth it is. Pinning the fundamental to unit
  // magnitude and holding the partials well below it keeps the gross shape
  // constant — one big wave per period, before and after — while the partials
  // survive as the skew and shoulders that tell one voice from another.
  const f0 = Math.hypot(reA[0], reB[0]);
  const norm = f0 > 1e-6 ? 1 / f0 : 0;
  for (let k = 0; k < HARMONICS; k++) {
    const w = k === 0 ? 1 : CHARACTER / (k + 1);
    reA[k] *= norm * w;
    reB[k] *= norm * w;
  }

  // Phase-lock to the fundamental before reconstructing. The raw zero-crossing
  // trigger only gets the start within a sample or two of the true period, and
  // the leftover phase error differs every capture. Easing between cycles that
  // disagree in phase averages them toward flat — that is why the wave collapsed
  // to a ribbon a moment after a note sounded. Rotating so the fundamental
  // always starts at zero rising makes successive captures reinforce, and lines
  // them up with the resting sine, which starts the same way.
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

  // Peak-normalize. Safe now that the curve is band-limited — the lone spike
  // that made peak normalization collapse the wave last time cannot survive a
  // five-harmonic reconstruction. This is what keeps a captured wave the same
  // visual height as the resting sine.
  const scale = 1 / peak;

  // Ease into the retained shape instead of replacing it. Each capture is a
  // different slice of a moving signal, so frame-to-frame they disagree in
  // detail; converging over ~0.25s turns that disagreement into drift.
  for (let j = 0; j < WAVE_SIZE; j++) {
    shape[j] += (smooth[j] * scale - shape[j]) * 0.18;
  }

  return true;
}
