import { NOTE_HUE_GLSL } from "./palette";

/**
 * Causation — undulating dot grid, mono. Adapted from an MIT dot-grid ripple
 * sketch (E. T. Carter, shader.gallery). Cursor/clicks/notes are ripple sources;
 * each note also prints a rotated halftone screen (15°/75°/0°/45°) in its key color.
 * Macros: x glow, y density, z drift speed, w ripple amplitude.
 */
export const causationFragment = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uShaderTime;
uniform vec2  uResolution;
uniform vec2  uPointer;
uniform vec2  uClickPos;
uniform float uClickImpulse;
uniform float uClickStrength;
uniform float uNoteOn;
uniform float uVelocity;
uniform float uReactivity;
uniform vec4  uMacros;
uniform vec4  uNoteFreqNorms;
uniform vec4  uNoteAmts;
// Faders: x dot count, y edge hardness, z wavefront width, w ripple wavelength.
uniform vec4  uSynth;

// Wave height ~-1..1. Every disturbance goes through here so the mono grid
// and the halftone screens stay in registration.
float waveAt(in vec2 c, in float t, in vec2 mp, in float pActive, in float echo) {
  // Incommensurate frequencies: never settles into a beat.
  float k = 6.2831 / (0.55 * exp2(uSynth.w * 0.6));
  float w = sin(length(c - vec2(-0.35, 0.22)) * k - t * 1.4)
          + 0.8 * sin(length(c - vec2(0.38, -0.28)) * k * 1.13 - t * 1.55)
          + 0.45 * sin(dot(c, vec2(0.66, 1.0)) * 4.2 + t * 0.8);

  float dm = length(c - mp);
  w += pActive * (0.9 + echo * 0.9) * sin(dm * k * 1.25 - t * 2.3) * exp(-dm * 2.6);

  // Ring expands as the impulse decays: crest plus trailing trough.
  if (uClickImpulse > 0.001 && uClickStrength > 0.001) {
    vec2 cp = uClickPos * 0.5 * vec2(uResolution.x / uResolution.y, 1.0);
    float x = length(c - cp) - (1.0 - uClickImpulse) * 1.7;
    float s = exp2(uSynth.z);
    float ring = exp(-x * x * (130.0 / s))
               - 0.5 * exp(-(x + 0.14 * s) * (x + 0.14 * s) * (80.0 / s));
    w += ring * uClickImpulse * uClickStrength * (1.7 + echo * 1.3);
  }

  return w * 0.4;
}

${NOTE_HUE_GLSL}

void main() {
  float mGlow    = uMacros.x;
  float mDensity = uMacros.y;
  float mDrift   = uMacros.z;
  float mEcho    = uMacros.w;

  float aspect = uResolution.x / uResolution.y;
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

  // Wall clock keeps it moving; uShaderTime quickens it on input.
  float t = uTime * (0.5 + mDrift * 0.9) + uShaderTime * 0.8;

  // uPointer is off-screen until first move.
  float pActive = step(abs(uPointer.x), 1.5) * step(abs(uPointer.y), 1.5);
  vec2 mp = uPointer * 0.5 * vec2(aspect, 1.0);

  // ── Mono grid ──
  // Floor 70: coarser dots swallow the hero text.
  float N = max(70.0, mix(80.0, 170.0, mDensity) * exp2(uSynth.x * 0.7));
  // Sample at cell center so each dot swells as a unit.
  vec2 cellC = (floor(p * N) + 0.5) / N;
  vec2 g = fract(p * N) - 0.5;

  float w = waveAt(cellC, t, mp, pActive, mEcho);

  float pulse = uNoteOn * max(uVelocity, 0.4) * (0.5 + 0.5 * uReactivity);
  pulse = clamp(pulse, 0.0, 1.0);

  float dm = length(cellC - mp);
  float lens = pActive * exp(-dm * dm * 14.0);

  float radius = 0.26 + 0.16 * w + lens * 0.12 + pulse * 0.03;
  radius = clamp(radius, 0.05, 0.47);

  // ~1.5px AA in cell units; cutoff fader blurs or hardens the edge.
  float aa = clamp(1.5 * N / uResolution.y * exp2(-uSynth.y * 1.5), 0.004, 0.2);
  float dotMask = smoothstep(radius + aa, radius - aa, length(g));

  float h = w * 0.5 + 0.5;
  float lum = mix(0.14, 0.95, smoothstep(0.06, 0.94, h));
  lum *= 1.0 + lens * 0.35 + pulse * 0.20;

  vec3 col = mix(vec3(0.015), vec3(lum), dotMask);

  // ── Halftone screens, one per voice ──
  float Ns = N * 1.5;
  float aaS = clamp(1.5 * Ns / uResolution.y, 0.004, 0.25);
  for (int i = 0; i < 4; i++) {
    float amt = uNoteAmts[i];
    if (amt < 0.004) continue;

    float ang = 0.7854;             // 45°
    if (i == 0) ang = 0.2618;       // 15°
    else if (i == 1) ang = 1.3090;  // 75°
    else if (i == 2) ang = 0.0;     //  0°
    float ca = cos(ang);
    float sa = sin(ang);
    mat2 R  = mat2(ca, sa, -sa, ca);
    mat2 Rt = mat2(ca, -sa, sa, ca);

    vec2 pr = R * p;
    vec2 cr = (floor(pr * Ns) + 0.5) / Ns;
    float wv = waveAt(Rt * cr, t, mp, pActive, mEcho);

    float rr = amt * (0.14 + 0.34 * (wv * 0.5 + 0.5));
    float mask = smoothstep(rr + aaS, rr - aaS, length(fract(pr * Ns) - 0.5));

    // Screen blend. Radius carries the envelope; ink only fades at the tail.
    vec3 ink = noteHue(uNoteFreqNorms[i]) * mask * min(1.0, amt * 1.9);
    col = 1.0 - (1.0 - col) * (1.0 - ink);
  }

  col = clamp(col + mGlow * 0.05, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`;
