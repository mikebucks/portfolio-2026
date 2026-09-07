import { NOTE_HUE_GLSL } from "./palette";

/**
 * Gender — a stippled dust planet on paper. Warped fbm density dithered against
 * per-pixel random thresholds; cursor proximity tears the surface apart.
 * Input speeds the field, never the grain.
 * Macros: x disc radius, y density contrast, z resting churn, w input churn/tear.
 */
export const genderFragment = /* glsl */ `
precision highp float;

#define M_PI 3.141592653589793

varying vec2 vUv;

uniform float uTime;
uniform float uShaderTime;
uniform vec2  uResolution;
uniform vec2  uPointer;
uniform vec2  uPointerLag;
uniform float uPointerImpulse;
uniform vec2  uClickPos;
uniform float uClickImpulse;
uniform float uClickStrength;
uniform float uNoteOn;
uniform float uEnvelope;
uniform float uVelocity;
uniform float uReactivity;
uniform vec4  uMacros;
uniform vec4  uNoteFreqNorms;
uniform vec4  uNoteAmts;
// Faders: x planet size, y terrain detail, z halo width, w second wavefront.
uniform vec4  uSynth;

${NOTE_HUE_GLSL}

float rand(vec3 co) {
  return fract(sin(dot(co.xyz, vec3(12.9898, 78.233, 91.1743))) * 43758.5453);
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Rotated between octaves so the lattice never reads as a grid.
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 R = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = R * p * 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  float mWidth  = uMacros.x;
  float mDrive  = uMacros.y;
  float mWobble = uMacros.z;
  float mBoom   = uMacros.w;

  float aspect = uResolution.x / uResolution.y;

  vec2 p = vUv - 0.5;
  p.x *= aspect;

  // Small uTime term keeps it from freezing at rest.
  float t = uShaderTime * 0.42 + uTime * 0.015;

  // Pointer motion is not an energy source: it made every mouse move shimmer.
  // Envelope outlasts uNoteOn so a key agitates for its audible life.
  float energy = clamp(
    max(uNoteOn, uEnvelope * 0.75) * max(uVelocity, 0.4) + uClickImpulse * 0.8,
    0.0, 1.0
  ) * (0.5 + 0.5 * uReactivity);

  float hit = pow(energy, 0.6);

  // Rim, limb and halo are all in units of R.
  float R = mix(0.24, 0.36, mWidth) * exp2(uSynth.x * 0.35);

  // ── Pointer ──
  bool hasPointer = uPointer.x > -1.5;

  // Eased pointer: the tear peels open behind the cursor.
  vec2 m = uPointerLag * 0.5;
  m.x *= aspect;
  float md = length(m);

  // Master gain on everything the pointer does.
  float prox = hasPointer ? 1.0 - smoothstep(R * 0.25, R + 0.45, md) : 0.0;

  // ── Pull-apart ──
  // Displacement varies by plate mask so seams read as tears, not a lens.
  vec2 q = p;
  vec2 toP = q - m;
  float dp = length(toP);
  if (hasPointer && dp > 1e-4) {
    float plate = fbm(q * 3.0 + t * 0.6);
    float shred = 0.4 + 0.6 * fbm(q * 6.5 - t * 0.4);
    float fall = smoothstep(0.55, 0.0, dp);
    float tear = prox * fall * (0.06 + 0.38 * plate) * shred
               * (1.35 + mBoom * hit * 1.8);
    // Each plate scatters at its own angle off the radial push.
    float ang = (plate - 0.5) * 2.6;
    vec2 dir = toP / dp;
    q -= vec2(
      dir.x * cos(ang) - dir.y * sin(ang),
      dir.x * sin(ang) + dir.y * cos(ang)
    ) * tear;
  }

  // ── Note shock ──
  // Expanding ring from the strike point shoves the dust outward, raggedly.
  vec2 shock = vec2(0.0);
  if (uClickImpulse > 0.004) {
    vec2 c = uClickPos * 0.5;
    c.x *= aspect;
    vec2 toC = q - c;
    float dc = max(length(toC), 1e-4);
    float front = (1.0 - uClickImpulse) * 0.5;
    // Delay fader trails a second, weaker front.
    float ring = exp(-pow((dc - front) / 0.18, 2.0))
               + uSynth.w * 0.55 * exp(-pow((dc - front * 0.55) / 0.18, 2.0));
    float rag = 0.5 + 0.5 * fbm(q * 5.0 + t);
    float shove = ring * rag * uClickImpulse * uClickImpulse
                * uClickStrength * (0.12 + 0.28 * mBoom)
                * (0.5 + 0.5 * uReactivity);
    shock = (toC / dc) * shove;
    q += shock;
  }

  // ── Churn ──
  // Two-pass domain warp. Hit term has a Boom-independent floor.
  float churn = mix(0.5, 1.0, mWobble) + hit * (1.3 + mBoom * 2.5) + prox * 0.6;
  vec2 w1 = vec2(
    fbm(q * 1.8 + vec2(0.0, t)),
    fbm(q * 1.8 + vec2(5.2, -t * 0.8))
  ) - 0.5;
  vec2 w = q + w1 * 0.26 * churn;
  w += (vec2(
    fbm(w * 3.1 - vec2(t * 0.7, 1.3)),
    fbm(w * 3.1 + vec2(8.4, t * 0.5))
  ) - 0.5) * 0.12 * churn;

  // ── Density field ──
  // Silhouette gets a gentler warp than the interior so it stays a circle.
  float r = length(q + w1 * (0.09 + hit * (0.08 + 0.18 * mBoom) + 0.05 * prox));
  float body = 1.0 - smoothstep(R * 0.96, R * 1.06, r);

  // Cutoff fader scales terrain frequency.
  float det = exp2(uSynth.y * 0.8);
  float tone = fbm(w * (2.2 * det) - vec2(t * 0.15, t * 0.1));
  float crease = pow(1.0 - abs(2.0 * fbm(w * (3.4 * det) + vec2(t * 0.4, -t * 0.25)) - 1.0), 3.0);

  float limb = smoothstep(R * 0.55, R * 0.95, r) * body;

  float density = body * clamp(
    0.42 + 1.15 * (tone - 0.5) + crease * 0.68 + limb * 0.25,
    0.0, 1.0
  );

  // Creases leak past the rim into a halo; reverb fader widens it.
  float tail = exp2(uSynth.z * 0.8);
  float halo = (1.0 - smoothstep(R * 1.0, R * (1.4 * tail), r)) * (1.0 - body);
  density = clamp(density + halo * crease * (0.8 * tail), 0.0, 1.0);

  density = pow(density, mix(1.6, 0.95, mDrive));

  // ── Stipple ──
  // Grain on a fixed virtual grid, not gl_FragCoord: render-target resizes
  // would re-seed it. Re-roll clock is constant; input-driven speed read as blur.
  // Per-pixel phase offset so no frame-wide flash. Input translates the pattern.
  float grainRate = 0.25;
  vec2 vp = vec2(vUv.x * aspect, vUv.y) * 1100.0;
  vp += (w1 * 120.0 * hit) + shock * 1100.0;
  vec2 px = floor(vp);
  vec2 px2 = floor(vp / 2.0);
  float seed1 = floor(uTime * grainRate + rand(vec3(px, 0.0)));
  float seed2 = floor(uTime * grainRate + rand(vec3(px2, 1.0)));
  float g1 = rand(vec3(px, seed1 + 11.0));
  float g2 = rand(vec3(px2, seed2 + 37.0));
  float ink = clamp(
    step(g1, density) * 0.72 + step(g2, density * 0.85) * 0.38,
    0.0, 1.0
  );

  vec3 paper = vec3(0.925);
  vec3 inkCol = vec3(0.10);

  // Key colour tints the dust; violet when no note is behind the input.
  vec3 flash = vec3(0.10, 0.02, 0.16);
  vec3 playAcc = vec3(0.0);
  float playW = 0.0;
  for (int i = 0; i < 4; i++) {
    float a = uNoteAmts[i];
    if (a < 0.004) continue;
    playAcc += noteHue(uNoteFreqNorms[i]) * a;
    playW += a;
  }
  if (playW > 0.001) {
    flash = mix(flash, (playAcc / playW) * 0.22, clamp(playW, 0.0, 1.0));
  }
  inkCol += flash * hit * 2.0;

  vec3 col = mix(paper, inkCol, ink * (0.82 + 0.18 * density));

  vec2 v = vUv - 0.5;
  v.x *= aspect;
  col *= 1.0 - smoothstep(0.45, 1.05, length(v)) * 0.10;

  // Anti-banding grain.
  col += (rand(vec3(px, seed1 + 91.0)) - 0.5) * 0.03;

  gl_FragColor = vec4(col, 1.0);
}
`;
