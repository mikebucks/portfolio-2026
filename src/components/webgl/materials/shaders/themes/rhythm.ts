import { NOTE_HUE_GLSL } from "./palette";

/**
 * Rhythm — a row of pendulum bobs on 1px strings from the top edge, white at rest.
 * Locked: unison swing, vertical travelling wave, always equidistant (pure sines
 * on monotonic clocks), notes drive tempo. Colour comes only from the keyboard.
 * Macros: x swing, y wave height, z tempo, w glow. Faders: x count, y focus, z wash, w wave rate.
 */
export const rhythmFragment = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uShaderTime;
uniform vec2  uResolution;
uniform vec2  uPointer;
uniform float uPointerImpulse;
uniform vec2  uClickPos;
uniform float uClickImpulse;
uniform float uNoteOn;
uniform float uNotePulse;
uniform float uVelocity;
uniform float uEnvelope;
uniform float uReactivity;
uniform sampler2D uWave;
uniform vec4  uMacros;
uniform vec4  uNoteFreqNorms;
uniform vec4  uNoteAmts;
// Spring-eased 0 = wave, 1 = mandala; overshoots both ends, holds after the last note.
uniform float uFormMorph;
uniform vec4  uSynth;
// Eased count, 8..32; fractional only while easing.
uniform float uPendCount;
// x: wave's monotonic phase clock (JS-integrated), y: its current rate.
uniform vec2  uWaveClock;

${NOTE_HUE_GLSL}

const float NPEND_MAX = 32.0;
const float PI    = 3.14159265;
const float TAU   = 6.28318531;

// Wave runs faster than the swing so the crest reads as its own motion.
const float WAVE_SPEED = 1.5;

// One cycle of the synth's live output, 0.5 == silence.
float wave(float x) {
  return texture2D(uWave, vec2(x, 0.5)).r * 2.0 - 1.0;
}

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  vec2 ap = p - a;
  float h = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
  return length(ap - ab * h);
}

// Mandala: two counter-rotating rings. Pivots paired outside-in and crossed
// (left pivot → right side) so strings intersect. Even pairs outer, odd inner. N even.
vec2 formationPos(float i, float N, vec2 C, float rIn, float rOut) {
  float last = N - 1.0;
  float outerCnt = 2.0 * ceil(N * 0.25);
  float innerCnt = N - outerCnt;
  float p    = min(i, last - i);                // pair index, 0 = the ends
  float side = i <= last - i ? -1.0 : 1.0;
  float outer = mod(p, 2.0) < 0.5 ? 1.0 : 0.0;
  float q    = floor(p * 0.5);                  // index within its ring
  float cnt  = outer > 0.5 ? outerCnt : innerCnt;
  float off  = (q + 0.5) * (TAU / cnt);
  float r    = outer > 0.5 ? rOut : rIn;
  float dir  = outer > 0.5 ? -1.0 : 1.0;
  float ang  = PI * 0.5 + side * off + dir * (uTime * 0.25 + uShaderTime * 2.4);
  return C + r * vec2(cos(ang), sin(ang));
}

void main() {
  float mSwing = uMacros.x;
  float mWave  = uMacros.y;
  float mTempo = uMacros.z;
  float mGlow  = uMacros.w;

  float aspect = uResolution.x / uResolution.y;

  // Isotropic space: x 0..aspect, y 0..1 bottom-up.
  vec2 P = vec2(vUv.x * aspect, vUv.y);
  float pxU = 1.0 / uResolution.y;

  // Faders: every factor and exponent is exactly 1 at rest.
  float fCut = uSynth.y;
  float fRev = uSynth.z;
  float bright = 1.0 + 0.6 * fCut;                    // 0.4 .. 1.6
  float soften = 1.0 + max(-fCut, 0.0);               // core AA width ×1 .. ×2
  float spread = 1.0 + 0.6 * fRev;                    // halo width 0.4 .. 1.6
  float linger = 1.0 / (1.0 + 0.7 * fRev);            // envelope exponent 0.59 .. 3.3
  float env    = pow(max(uEnvelope, 0.0), linger);
  vec4  amts   = pow(max(uNoteAmts, vec4(0.0)), vec4(linger));
  // Formation pairs pivots outside-in, so it needs an even count.
  float N = 2.0 * floor(uPendCount * 0.5 + 0.5);

  // Monotonic phase: notes only speed it up, never step back, so sin stays symmetric.
  float drive = 2.6 * (0.55 + 0.9 * mTempo);
  float phase = uTime * 0.78 + uShaderTime * drive;
  float wPhase = uWaveClock.x;

  float energy = clamp(uNoteOn * max(uVelocity, 0.4) + env * 0.7, 0.0, 1.4)
               * (0.5 + 0.5 * uReactivity);

  // Only sounding notes bring colour in.
  float colorAmt = clamp(energy, 0.0, 1.0);

  float pivotY = 1.0;                     // top edge
  float restY  = 0.5;
  float sp     = aspect / max(uPendCount - 1.0, 1.0); // edge-to-edge spacing
  float x0     = 0.0;

  // Unison swing: whole rack translates together, so amplitude is independent of spacing.
  float swingAmp = (0.045 + 0.05 * mSwing) * (1.0 + 0.6 * energy);
  float swingX   = swingAmp * sin(phase);

  // WAVE_K holds ~2.5 wavelengths across the rack at any count.
  float waveAmp = (0.055 + 0.09 * mWave) * (1.0 + 0.5 * energy);
  float WAVE_K  = TAU * 2.5 / uPendCount;

  // Full-size bulb radius; kept small so the note swell has headroom.
  float bobR = 0.0085;

  // uPointer sentinel (-9,-9) lands far from every bulb, so no cursor = minimum size.
  bool  hasPtr = uPointer.x > -1.5;
  vec2  ptrP   = vec2((uPointer.x * 0.5 + 0.5) * aspect, uPointer.y * 0.5 + 0.5);
  float reach  = 0.28;                      // spotlight radius

  // Mandala formation; strings crossing is intended.
  vec2  figC   = vec2(aspect * 0.5, 0.5);
  float figRin  = 0.19;
  float figRout = 0.34;
  float morph  = uFormMorph;
  float morphC = clamp(morph, 0.0, 1.0);

  vec3  bobCol   = vec3(0.0);   // halo
  vec3  coreCol  = vec3(0.0);   // crisp discs
  float bobGlow  = 0.0;         // total, for the note flash
  vec3  trailCol = vec3(0.0);
  float filament = 0.0;

  // Played pitch on the palette, summed once.
  vec3  playAcc = vec3(0.0);
  float playW   = 0.0;
  for (int v = 0; v < 4; v++) {
    float a = amts[v];
    if (a < 0.004) continue;
    playAcc += noteHue(uNoteFreqNorms[v]) * a;
    playW   += a;
  }
  vec3  playHue = playW > 0.001 ? playAcc / playW : vec3(0.0);
  float playAmt = clamp(playW, 0.0, 1.0) * 0.5;

  for (float i = 0.0; i < NPEND_MAX; i += 1.0) {
    if (i >= ceil(uPendCount)) break;
    // Newest bob fades up as it slides in from the right edge.
    float w  = clamp(uPendCount - i, 0.0, 1.0);
    float fi = i / max(uPendCount - 1.0, 1.0);   // 0..1 across the row

    float px    = x0 + i * sp;
    vec2  pivot = vec2(px, pivotY);

    float wy      = waveAmp * sin(wPhase + i * WAVE_K);
    vec2  sineBob = vec2(px + swingX, restY + wy);

    // morph overshoots 0..1 (spring), so this extrapolates slightly.
    vec2  bob = mix(sineBob, formationPos(i, N, figC, figRin, figRout), morph);

    // Bulb size: full under the cursor, an eighth away from it.
    float pd    = hasPtr ? length(bob - ptrP) : 1e3;
    float prox  = exp(-(pd * pd) / (reach * reach));
    // 0.55: formation blooms only to half size so the note swell has headroom.
    float sizeK = max(mix(0.125, 1.0, prox), morphC * 0.55);
    // uNotePulse also sets spin rate, so swell and deceleration share a timer.
    float br    = bobR * sizeK * (1.0 + 2.0 * uNotePulse);

    vec3 ribbon = noteHue(fract(fi + uTime * 0.012));
    ribbon = mix(ribbon, playHue, playAmt);
    vec3 hue = mix(vec3(1.0), ribbon, colorAmt);

    // Live-waveform shimmer so the glow carries timbre.
    float shim = 1.0 + 0.18 * wave(fi + phase * 0.05) * (0.3 + energy);

    // string: ~1px
    float ds = segDist(P, pivot, bob);
    float fl = 1.0 - smoothstep(0.6 * pxU, 1.6 * pxU, ds);
    filament += fl * w;

    // phosphor trail: lagged positions. Wave lag scaled by its rate so the trail follows the real path.
    float lagK = 0.16 * (1.0 + 0.6 * fRev);
    float sm = 0.0;
    for (float k = 1.0; k <= 3.0; k += 1.0) {
      float lp   = phase - k * lagK;
      float lw   = wPhase - k * lagK * WAVE_SPEED * uWaveClock.y;
      vec2  bp   = vec2(px + swingAmp * sin(lp),
                        restY + waveAmp * sin(lw + i * WAVE_K));
      float d    = length(P - bp);
      sm += exp(-k * 0.75) * exp(-d * d / (br * br * 4.0));
    }
    trailCol += hue * sm * w * (1.0 + 0.8 * max(fRev, 0.0));

    // bob: crisp core + soft halo. 1 - smoothstep stays valid at eighth size.
    float d2   = length(P - bob);
    float aa   = 1.2 * pxU * soften;
    float core = 1.0 - smoothstep(br - aa, br + aa, d2);
    float halo = exp(-d2 * d2 / (br * br * 2.5 * spread * spread));
    // Core flushes harder toward playHue than the halo.
    vec3 coreHue = mix(vec3(1.0),
                       mix(ribbon, playHue, min(1.0, playAmt * 2.0)),
                       clamp(colorAmt * 1.5, 0.0, 0.95));
    coreCol  += coreHue * core * shim * w;
    bobCol   += hue * halo * shim * w;
    bobGlow  += (core + halo) * shim * w;
  }

  vec3 BG  = vec3(0.030, 0.031, 0.038);
  vec3 col = BG;

  float glow = 0.55 + 0.9 * mGlow;

  col += vec3(1.0) * filament * 0.18 * bright;        // strings, dim grey

  col += trailCol * (0.05 + 0.06 * mGlow) * (1.0 - morphC); // smear (wave only)
  col += bobCol * (0.22 * glow) * (1.0 + 0.9 * energy) * bright;
  col += coreCol * 1.4 * bright;

  // Note flash, tinted toward the pitch so it doesn't wash the cores back to white.
  vec3 flashHue = mix(vec3(1.0), playHue, clamp(playW, 0.0, 1.0) * 0.75);
  col += flashHue * bobGlow * uNoteOn * max(uVelocity, 0.3) * 0.55
       * (0.5 + 0.5 * uReactivity);

  // Corners only, so edge strings and bobs aren't dimmed.
  vec2 vg = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
  float vign = 1.0 - smoothstep(0.85, 1.25, length(vg));
  col = mix(BG, col, 0.7 + 0.3 * vign);

  col = col / (1.0 + col * 0.28);

  float grain = fract(sin(dot(gl_FragCoord.xy + uTime, vec2(12.9898, 78.233))) * 43758.5453);
  col += (grain - 0.5) * (0.02 + energy * 0.02);

  gl_FragColor = vec4(col, 1.0);
}
`;
