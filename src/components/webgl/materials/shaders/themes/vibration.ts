import { NOTE_HUE_GLSL } from "./palette";

/**
 * Vibration — five strings drawn from the synth's live waveform; light lives in the
 * bands where pairs disagree in sign. Three bands add, two cut back to the ground.
 * Greyscale at rest, colour only from notes; the ground never moves.
 * Macros: x string frequency, y edge sharpness, z resting amplitude, w input flare.
 */
export const vibrationFragment = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uShaderTime;
uniform vec2  uResolution;
uniform vec2  uPointer;
uniform vec2  uPointerLag;
uniform float uPointerImpulse;
uniform vec2  uClickPos;
uniform float uClickImpulse;
uniform float uNoteOn;
uniform float uVelocity;
uniform float uEnvelope;
uniform float uReactivity;
uniform sampler2D uWave;
uniform vec4  uMacros;
uniform vec4  uNoteFreqNorms;
uniform vec4  uNoteAmts;
// Fader offsets -1..1, 0 = untouched: x amplitude, y crisp edge, z soft wash, w echo offset.
uniform vec4  uSynth;

${NOTE_HUE_GLSL}

// One cycle of the synth's live output, repeat-wrapped; x counts periods. 0.5 is silence.
float wave(float x) {
  return texture2D(uWave, vec2(x, 0.5)).r * 2.0 - 1.0;
}

float rand(vec3 co) {
  return fract(sin(dot(co.xyz, vec3(12.9898, 78.233, 91.1743))) * 43758.5453);
}

// Band where a and b straddle zero. Clamped here so summed layers stay distinct;
// max() guards pow() against a negative base (NaN on highp).
float band(float a, float b, float sharp) {
  return clamp(pow(max(0.0, 1.0 - a * b), sharp), 0.0, 1.0);
}

// Palette hue to additive primary: strip the common grey, normalise. Palette stops
// summed as-is go white.
vec3 primary(vec3 c) {
  vec3 v = c - min(c.r, min(c.g, c.b));
  return v / max(max(v.r, max(v.g, v.b)), 1e-4);
}


void main() {
  float mWidth  = uMacros.x;
  float mDrive  = uMacros.y;
  float mWobble = uMacros.z;
  float mBoom   = uMacros.w;

  vec2 c = vUv;
  float aspect = uResolution.x / uResolution.y;

  // Not aspect-corrected on purpose: wave count is fixed, not growing with width.
  vec2 p = c;

  // Real-time floor: on uShaderTime alone the resting pace reads as stopped.
  float t = uTime * 0.20 + uShaderTime * 1.1;

  float energy = clamp(
    uNoteOn * max(uVelocity, 0.4) + uClickImpulse * 0.8 + uPointerImpulse * 0.3,
    0.0, 1.0
  ) * (0.5 + 0.5 * uReactivity);
  float hit = pow(energy, 0.6);

  float mid = 0.50;

  // Pluck: strings dragged toward the eased cursor, local to its column.
  bool hasPointer = uPointer.x > -1.5;
  // Same unstretched space as p.x, or the pluck misses the cursor.
  vec2 mp = uPointerLag * 0.5 + 0.5;
  float dx = p.x - mp.x;
  float pluck = hasPointer
    ? (mp.y - mid) * exp(-dx * dx * 26.0) * (0.55 + 0.45 * uPointerImpulse)
    : 0.0;

  // Strike: wave packet from the click, on real time so its pace is fixed.
  vec2 cp = uClickPos * 0.5 + 0.5;
  float cdx = p.x - cp.x;
  float strike = sin(cdx * 26.0 - uTime * 9.0)
               * exp(-cdx * cdx * 14.0) * uClickImpulse * 0.5;

  float excite = clamp(hit + uEnvelope * 0.6, 0.0, 1.5);
  float amp = mix(0.15, 0.26, mWobble) * (1.0 + 0.35 * excite) * (1.0 + uSynth.x * 0.45);
  float bend = pluck * 0.45 + strike * 0.22;

  // Cycles across the frame.
  float cyc = mix(3.2, 6.5, mWidth);
  float slow = mix(0.22, 0.45, mWidth);

  // Jitter the sample height (not the result) so edges dissolve into grain.
  float grit = mix(0.006, 0.018, mWobble) + excite * 0.020;
  float py = p.y + (rand(vec3(gl_FragCoord.xy, floor(uTime * 24.0))) - 0.5) * grit;

  // Slow per-string amplitude envelopes. envR's floor is lifted and envG/envB
  // capped at 1.0 so hr's crest always clears the dark bands.
  float envR = 0.95 + 0.25 * wave(p.x * 0.41 + t * 0.09);
  float envG = 0.66 + 0.34 * wave(p.x * 0.67 - t * 0.07 + 0.31);
  float envB = 0.62 + 0.38 * wave(p.x * 0.23 + t * 0.05 + 0.62);
  float envD = 0.72 + 0.48 * wave(p.x * 0.83 - t * 0.11 + 0.19);
  float envE = 0.72 + 0.48 * wave(p.x * 0.17 + t * 0.04 + 0.44);

  // Rest lines fanned apart; amplitudes still overrun so strings keep crossing.
  float fan = mix(0.03, 0.075, mWobble);

  // hr swings widest: it bounds both bright bands and must clear the dark ones.
  // echo offsets each string's clock one step further: an echo cascade.
  float echo = uSynth.w * 0.30;
  float hr = py - (wave(p.x * cyc        - t * 0.95)                 * amp * 1.35 * envR + mid             + bend);
  float hg = py - (wave(p.x * cyc * 1.67 - (t - echo) * 1.20)        * amp * 0.5  * envG + mid + fan       + bend);
  float hb = py - (wave(p.x * slow       - (t - echo * 2.0) * 0.85)  * amp        * envB + mid - fan * 0.8 + bend * 0.6);
  float hd = py - (wave(p.x * cyc * 2.60 - (t - echo * 3.0) * 1.45)  * amp * 0.28 * envD + mid + fan * 1.9 + bend);
  float he = py - (wave(p.x * slow * 0.6 + (t - echo * 4.0) * 0.55)  * amp * 0.75 * envE + mid - fan * 2.1 + bend * 0.4);

  // One crisp exponent (cutoff fader) and one soft (reverb fader), independent.
  float flare = 1.0 - 0.35 * mBoom * hit;
  float sharpA = mix(900.0, 2000.0, mDrive) * flare * (1.0 + uSynth.y * 0.5);
  float sharpB = mix(140.0, 320.0, mDrive) * flare * (1.0 - uSynth.z * 0.45);

  float fr = band(hr, hg, sharpA);
  float fg = band(hg, hb, sharpB);
  // Clamp after the boost so it widens the solid region without shifting hue.
  float fb = clamp(band(hb, hr, sharpB) * 2.0, 0.0, 1.0);

  float fd = band(hd, hg, sharpA * 1.3);
  float fe = band(he, hb, sharpB * 0.8);

  // The one constant; nothing moves it.
  vec3 ground = vec3(0.072, 0.073, 0.082);

  // Greys chosen so every stack lands at a distinct level without clipping.
  vec3 greyA = vec3(0.28);
  vec3 greyC = vec3(0.50);
  vec3 greyD = vec3(0.12);

  vec3 hueA = greyA;
  vec3 hueC = greyC;
  vec3 hueD = greyD;

  // uNoteAmts alone: clicks and pointer move the strings without tinting them.
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 4; i++) {
    float a = uNoteAmts[i];
    if (a < 0.004) continue;
    acc += noteHue(uNoteFreqNorms[i]) * a;
    wsum += a;
  }
  if (wsum > 0.001) {
    float chroma = clamp(wsum, 0.0, 1.0);
    // 0.35: pulling fully toward the pitch would merge the bands' hues.
    vec3 played = primary(acc / wsum);
    vec3 colA = mix(primary(noteHue(0.0)), played, 0.35);
    vec3 colC = mix(primary(noteHue(0.7)), played, 0.35);
    vec3 colD = mix(primary(noteHue(0.5)), played, 0.35);
    hueA = mix(greyA, colA, chroma);
    hueC = mix(greyC, colC, chroma);
    hueD = mix(greyD, colD, chroma);
  }

  // Three add, two cut. Additive bands at full strength: scaling changes their hue.
  vec3 col = ground;
  col += hueA * fr;
  col += hueC * fb;
  col += hueD * fd;
  // Partial cuts so a crossing reads as one shape behind another, not a hole.
  col = mix(col, ground, fg * 0.82);
  col = mix(col, ground, fe * 0.68);

  col = clamp(col, 0.0, 1.0);

  // Vignette the lit part only; the ground stays constant.
  vec2 v = c - 0.5;
  v.x *= aspect;
  col = ground + (col - ground)
      * (1.0 - smoothstep(0.45, 1.05, length(v)) * 0.3);

  // Grain scaled by distance off the ground, so the background stays flat.
  float lit = clamp(length(col - ground) * 3.0, 0.0, 1.0);
  float grain = 0.045 + excite * 0.05;
  col += (rand(vec3(gl_FragCoord.xy, floor(uTime * 20.0) + 7.0)) - 0.5)
       * grain * lit;

  gl_FragColor = vec4(col, 1.0);
}
`;
