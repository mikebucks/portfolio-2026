import { NOTE_HUE_GLSL } from "./palette";

/**
 * Polarity — horn torus drawn only by two mirrored particle streams (v = π ∓ a).
 * Camera head-on at rest, swings overhead on a note (uViewTilt, eased in JS).
 * No per-particle trig: angles are fixed increments, walked by rotating unit vectors.
 * Macros: x scale, y flow speed, z per-ring stagger, w particle size/gain.
 */
export const polarityFragment = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uShaderTime;
uniform vec2  uResolution;
uniform vec2  uPointer;
uniform vec2  uPointerLag;
uniform float uPointerImpulse;
uniform float uClickImpulse;
uniform float uClickStrength;
uniform float uNoteOn;
uniform float uVelocity;
uniform float uReactivity;
uniform float uViewTilt;
uniform vec4  uMacros;
uniform vec4  uNoteFreqNorms;
uniform vec4  uNoteAmts;
// Fader offsets -1..1, 0 = untouched: x ring count, y particle size, z wake brightness, w stagger.
uniform vec4  uSynth;

${NOTE_HUE_GLSL}

// Resting ring count; volume fader ranges 20..RINGS_MAX, loop breaks at live count.
#define RINGS 28
#define RINGS_MAX 36

// Wake per ring: dense bright head, then sparse ghost samples closing the circle.
#define HEAD  10
#define GHOST 5

const float TAU = 6.283185307;
// ~5% screen height per step, roughly the ring gap, so the two families form a lattice.
const float DA_HEAD = 0.122;
const float DA_GHOST = (TAU - float(HEAD) * DA_HEAD) / float(GHOST);
// Weak perspective: scale about centre by depth.
const float PERSP = 0.30;
// Not fully overhead: last few degrees flatten rings into spokes.
const float TILT_REST = 0.045;
const float TILT_OVER = 1.30;

// Per-ring context for splat().
vec2  gQ;
vec2  gA;
float gCz, gZa, gZc;
float gSu, gCosT, gSinT, gInvZ;
float gHalo;
float gUp, gDn;

// One wake step: the mirror pair at v = π ∓ a, given (cos a, sin a).
void splat(float ca, float sa, float w, float kk) {
  // Horn torus: ring is A scaled 0..2; ca = 1 puts both particles on the origin.
  float s = 1.0 - ca;
  vec2 base = gA * s;
  float zb = gZa * s;
  float oy = gCz * sa;
  float zo = gZc * sa;

  // Taper cores toward the origin, where all rings pile up.
  kk *= 1.0 + 1.1 * (1.0 - min(s, 1.0));

  // Facing: normal vs view, kept gentle so the far surface stays a ghost.
  float fBase = -ca * gSu * gCosT;
  float fSide = sa * gSinT;

  // Halo floor (0.006) gives it finite reach; otherwise the ring cull draws a rim.
  float zu = zb + zo;
  vec2 du = gQ - vec2(base.x, base.y + oy) * (1.0 + zu * PERSP);
  float gu = 1.0 / (1.0 + dot(du, du) * kk);
  float vu = clamp((fBase + fSide) * 1.9 + 0.68, 0.26, 1.0);
  gUp += (gu * gu + max(gu - 0.006, 0.0) * gHalo)
       * w * vu * (0.72 + 0.28 * zu * gInvZ);

  float zd = zb - zo;
  vec2 dd = gQ - vec2(base.x, base.y - oy) * (1.0 + zd * PERSP);
  float gd = 1.0 / (1.0 + dot(dd, dd) * kk);
  float vd = clamp((fBase - fSide) * 1.9 + 0.68, 0.26, 1.0);
  gDn += (gd * gd + max(gd - 0.006, 0.0) * gHalo)
       * w * vd * (0.72 + 0.28 * zd * gInvZ);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  float mScale  = uMacros.x;
  float mFlow   = uMacros.y;
  float mSpiral = uMacros.z;
  float mBloom  = uMacros.w;

  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;

  // Centred, y-normalised: y ±0.5, x ±0.5·aspect.
  vec2 q = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

  // Full-bleed crop is intended; below square, shrink the space so the waist survives.
  float fit = clamp(aspect, 0.5, 1.0);
  q /= fit;

  float energy = clamp(
    uClickImpulse * uClickStrength * 1.15
      + uNoteOn * max(uVelocity, 0.4)
      + uPointerImpulse * 0.20,
    0.0, 1.0
  ) * (0.5 + 0.5 * uReactivity);
  // 0.65: sqrt lifted particles to excited size on a mere mouse drift.
  float hit = pow(energy, 0.65);

  // Camera: uViewTilt is the eased note envelope; colour rides it too.
  float note = clamp(uViewTilt, 0.0, 1.0);
  float view = note * note * (3.0 - 2.0 * note);
  float tilt = mix(TILT_REST, TILT_OVER, view);
  float cosT = cos(tilt);
  float sinT = sin(tilt);

  // Head-on figure is one screen height tall; pull back by half overhead.
  float rad = mix(0.385, 0.455, mScale) * mix(1.0, 0.52, view);

  bool hasPointer = uPointer.x > -1.5;
  float spin = uTime * 0.075 + (hasPointer ? uPointerLag.x * 0.5 : 0.0);

  // Lead particle's tube angle. uTime + monotonic uShaderTime: surges never step back.
  float flow = (uTime * 0.38 + uShaderTime * 2.42) * mix(0.72, 1.30, mFlow);
  // Stagger past a fraction of a ring gap dissolves the form; keep it small.
  int rings = RINGS + int(floor(uSynth.x * 8.0 + 0.5));
  float du = TAU / float(rings);
  float stagger = du * (mix(0.0, 0.55, mSpiral) + uSynth.w * 0.30);

  // The only transcendentals in the shader.
  float cdu = cos(du),        sdu = sin(du);
  float cst = cos(stagger),   sst = sin(stagger);
  float cdh = cos(-DA_HEAD),  sdh = sin(-DA_HEAD);
  float cdg = cos(-DA_GHOST), sdg = sin(-DA_GHOST);
  float cu  = cos(spin),      su  = sin(spin);
  float ch  = cos(flow),      sh  = sin(flow);

  // Inverse squared core radius (larger = smaller), relative to figure size.
  float spread = mix(6400.0, 900.0, hit)
               / (rad * rad * mix(1.0, 0.62, mBloom))
               * exp2(uSynth.y * 1.2);
  gHalo = 0.04 + 0.36 * hit;

  // Cull against a capsule along origin..2A; a circle would cover the whole frame.
  float capsR = rad * (1.13 * cosT + 0.26) + 0.018 + hit * 0.045;
  float capsR2 = capsR * capsR;

  gQ = q;
  gCosT = cosT;
  gSinT = sinT;
  gInvZ = 1.0 / (2.0 * rad);
  gCz = rad * cosT;
  gZc = rad * sinT;
  gUp = 0.0;
  gDn = 0.0;

  for (int i = 0; i < RINGS_MAX; i++) {
    if (i >= rings) break;
    // Ring at toroidal angle u, projected: centred on A, spanning origin..2A.
    vec2 A = vec2(rad * cu, -rad * sinT * su);

    vec2 axis = A + A;
    float t = clamp(dot(q, axis) / max(dot(axis, axis), 1e-6), 0.0, 1.0);
    vec2 dq = q - axis * t;
    if (dot(dq, dq) < capsR2) {
      gA = A;
      gZa = rad * su * cosT;
      gSu = su;

      float ca = ch;
      float sa = sh;

      for (int k = 0; k < HEAD; k++) {
        float b = 1.0 - float(k) / float(HEAD);
        splat(ca, sa, 0.22 + 0.78 * b * b * b, spread * (0.55 + 0.45 * b));
        float nca = ca * cdh - sa * sdh;
        sa = sa * cdh + ca * sdh;
        ca = nca;
      }

      // Ghost samples stay tight: wide blobs would fog the form.
      for (int k = 0; k < GHOST; k++) {
        float b = 1.0 - float(k) / float(GHOST);
        splat(ca, sa, (0.035 + 0.075 * b) * (1.0 + uSynth.z * 1.6), spread * 0.85);
        float nca = ca * cdg - sa * sdg;
        sa = sa * cdg + ca * sdg;
        ca = nca;
      }
    }

    float ncu = cu * cdu - su * sdu;
    su = su * cdu + cu * sdu;
    cu = ncu;
    float nch = ch * cst - sh * sst;
    sh = sh * cst + ch * sst;
    ch = nch;
  }

  float gain = mix(1.25, 1.90, mBloom) * (1.0 + hit * 0.85);
  float accUp = gUp * gain;
  // Overhead, the lower stream is mostly hidden; lift it to keep the pair equal.
  float accDn = gDn * gain * (1.0 + 0.30 * sinT);

  // White unless a note sounds. Up stream takes the key's hue, down its opposite;
  // chroma gated on voices and swing so it fades with the sound.
  vec3 hueAcc = vec3(0.0);
  vec3 oppAcc = vec3(0.0);
  float playW = 0.0;
  for (int i = 0; i < 4; i++) {
    float a = uNoteAmts[i];
    if (a < 0.004) continue;
    float n = uNoteFreqNorms[i];
    hueAcc += noteHue(n) * a;
    oppAcc += noteHue(fract(n + 0.5)) * a;
    playW += a;
  }
  vec3 hueUp = playW > 0.001 ? hueAcc / playW : vec3(1.0);
  vec3 hueDn = playW > 0.001 ? oppAcc / playW : vec3(1.0);

  float chroma = clamp(note * 1.35, 0.0, 1.0)
               * clamp(playW * 2.5, 0.0, 1.0);
  vec3 cool = mix(vec3(1.0), hueUp, chroma);
  vec3 warm = mix(vec3(1.0), hueDn, chroma);

  vec3 col = cool * accUp + warm * accDn;
  col += vec3(1.0) * min(accUp, accDn) * 0.75;

  // Ground: near black, cool above the equator, warm below.
  vec3 bg = vec3(0.017, 0.018, 0.023)
          + mix(vec3(0.026, 0.011, 0.005), vec3(0.005, 0.011, 0.026),
                smoothstep(0.10, 0.90, uv.y));
  // Centre glow, flares on input.
  bg += mix(vec3(0.66), (hueUp + hueDn) * 0.5, chroma)
      * exp(-length(q) * 6.0) * (0.014 + hit * 0.09);

  col += bg;

  // Rolloff: overlaps saturate to white instead of going neon.
  col = vec3(1.0) - exp(-col * 1.35);

  // Vignette on the raw frame, not the fitted space. Wide and slow: a tight one draws a rim on the haze.
  vec2 vg = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  col *= 1.0 - smoothstep(0.15, 1.35, length(vg)) * 0.32;

  // Grain against banding on the flat dark ground.
  col += hash(gl_FragCoord.xy + uTime) * 0.020 - 0.010;

  gl_FragColor = vec4(col, 1.0);
}
`;
