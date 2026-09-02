import { NOTE_HUE_GLSL } from "./palette";

/**
 * Causation theme — an undulating grid of circles. Adapted from an MIT-licensed
 * dot-grid ripple sketch (E. T. Carter, shader.gallery), stripped to the
 * black-and-white palette established by the Mind theme so the two read as the
 * same universe. Cause & Effect literally: every disturbance is a cause, and
 * the only thing the field can do is propagate its effect — a wave crossing the
 * grid, each circle swelling and brightening as the front passes through it.
 *
 * Reactivity:
 *   • ambient      two fixed ripple sources keep the grid undulating at rest;
 *                  notes accelerate the undulation via uShaderTime
 *   • pointer      a live ripple source, plus a lens that swells the circles
 *                  it passes over
 *   • click        an expanding ring wavefront from the point clicked (the
 *                  cause), rolling outward through the dots (the effect)
 *   • home-row     each note fires the same wavefront, placed by pitch, and
 *                  lays a rotated halftone screen over the grid in the key's
 *                  own palette color — up to four voices, each on its own
 *                  screen angle (15°/75°/0°/45°, the classic CMYK set), so a
 *                  chord prints a rosette
 *
 * Macros:
 *   x  Glow     — global brightness lift
 *   y  Density  — dot count across the frame
 *   z  Drift    — ambient undulation speed
 *   w  Echo     — ripple amplitude on cursor / clicks
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
// Synth fader offsets from the preset, -1..1, 0 = untouched. Here: x volume
// is the dot count (more pipes speaking), y cutoff hardens the dots' edges,
// z reverb widens the wavefront into a rolling swell, w delay sets the
// ripples' wavelength — the distance between repeats.
uniform vec4  uSynth;

// Wave height of the field at a point, in roughly -1..1. Everything that can
// disturb the grid funnels through here — ambient sources, the cursor, the
// click/note wavefront — so the mono dots and every halftone screen sample the
// exact same water and stay in registration.
float waveAt(in vec2 c, in float t, in vec2 mp, in float pActive, in float echo) {
  // Two fixed ripple sources at rule-of-thirds offsets, plus a slow diagonal
  // swell. Frequencies deliberately incommensurate so the interference pattern
  // never settles into a repeating beat.
  // The delay fader stretches the wavelength; the cursor source below shares k
  // so everything stays in registration.
  float k = 6.2831 / (0.55 * exp2(uSynth.w * 0.6));
  float w = sin(length(c - vec2(-0.35, 0.22)) * k - t * 1.4)
          + 0.8 * sin(length(c - vec2(0.38, -0.28)) * k * 1.13 - t * 1.55)
          + 0.45 * sin(dot(c, vec2(0.66, 1.0)) * 4.2 + t * 0.8);

  // The cursor is a live ripple source. Tight exponential falloff keeps it a
  // local disturbance rather than a third global source.
  float dm = length(c - mp);
  w += pActive * (0.9 + echo * 0.9) * sin(dm * k * 1.25 - t * 2.3) * exp(-dm * 2.6);

  // The click wavefront: a ring whose radius expands as uClickImpulse decays,
  // a raised crest with a shallow trough trailing it — a single wave rolling
  // outward from the cause. uClickStrength scales the response without
  // touching the impulse (which is the ring's clock), so a keypress can raise
  // a quieter wave than a deliberate click without starting it mid-flight.
  if (uClickImpulse > 0.001 && uClickStrength > 0.001) {
    vec2 cp = uClickPos * 0.5 * vec2(uResolution.x / uResolution.y, 1.0);
    float x = length(c - cp) - (1.0 - uClickImpulse) * 1.7;
    // The reverb fader widens the crest and its trough into a rolling swell —
    // one event, smeared. s == 1 at rest.
    float s = exp2(uSynth.z);
    float ring = exp(-x * x * (130.0 / s))
               - 0.5 * exp(-(x + 0.14 * s) * (x + 0.14 * s) * (80.0 / s));
    w += ring * uClickImpulse * uClickStrength * (1.7 + echo * 1.3);
  }

  return w * 0.4;
}

// The shared note palette, same as Mind, so the audio color reads identically.
// The base grid stays grayscale; these only ink the halftone screens.
${NOTE_HUE_GLSL}

void main() {
  float mGlow    = uMacros.x;
  float mDensity = uMacros.y;
  float mDrift   = uMacros.z;
  float mEcho    = uMacros.w;

  float aspect = uResolution.x / uResolution.y;
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  // Centered, aspect-corrected frame space: y spans -0.5..0.5.
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

  // Ambient time runs on the wall clock so the grid never freezes, and rides
  // uShaderTime on top — notes and clicks visibly quicken the water.
  float t = uTime * (0.5 + mDrift * 0.9) + uShaderTime * 0.8;

  // uPointer sits off-screen (-9,-9) until first move; gate so there's no
  // phantom ripple source before the user has actually moved.
  float pActive = step(abs(uPointer.x), 1.5) * step(abs(uPointer.y), 1.5);
  vec2 mp = uPointer * 0.5 * vec2(aspect, 1.0);

  // ── Mono screen: the grid itself ──────────────────────────────────────────
  // Density range tuned for legibility with the hero text sitting on top: at
  // the old 60–96 the crests were fat solid-white blobs the size of a glyph
  // stroke and the headline drowned in them; finer dots turn the same wave
  // into a halftone the eye reads as smooth tone, and the text pops back out.
  // The volume fader scales the count — the grid is procedural, so more dots
  // cost nothing. Floored so a quiet fader can't drop below the legible range.
  float N = max(70.0, mix(80.0, 170.0, mDensity) * exp2(uSynth.x * 0.7));
  // The wave is sampled at the cell center, not per-pixel, so each circle
  // swells and brightens as a unit — the grid reads as objects riding a wave,
  // not as a texture with dots stamped on it.
  vec2 cellC = (floor(p * N) + 0.5) / N;
  vec2 g = fract(p * N) - 0.5;

  float w = waveAt(cellC, t, mp, pActive, mEcho);

  // Global note pulse: a slight breath across the whole grid on a strike.
  float pulse = uNoteOn * max(uVelocity, 0.4) * (0.5 + 0.5 * uReactivity);
  pulse = clamp(pulse, 0.0, 1.0);

  // The cursor lens: circles directly under the pointer swell even between
  // wave crests, so the mouse visibly presses on the field as it moves.
  float dm = length(cellC - mp);
  float lens = pActive * exp(-dm * dm * 14.0);

  float radius = 0.26 + 0.16 * w + lens * 0.12 + pulse * 0.03;
  radius = clamp(radius, 0.05, 0.47);

  // Anti-alias width: ~1.5px expressed in cell-local units.
  // The cutoff fader is a literal low-pass on the dots: closing it widens the
  // edge until they blur into tone, opening it snaps them to hard print.
  float aa = clamp(1.5 * N / uResolution.y * exp2(-uSynth.y * 1.5), 0.004, 0.2);
  float dotMask = smoothstep(radius + aa, radius - aa, length(g));

  // Crest bright, trough sunk toward the ground — the wave reads in value as
  // well as in size. Ground stays near-black (the Mind key).
  float h = w * 0.5 + 0.5;
  float lum = mix(0.14, 0.95, smoothstep(0.06, 0.94, h));
  lum *= 1.0 + lens * 0.35 + pulse * 0.20;

  vec3 col = mix(vec3(0.015), vec3(lum), dotMask);

  // ── Halftone screens: the notes' color ────────────────────────────────────
  // Each sounding voice lays its own rotated dot screen over the grid, inked
  // in that key's palette color. Screen angles are the classic print set —
  // 15° / 75° / 0° / 45° — so two or more voices interfere into a rosette
  // rather than stacking into mud. Dot size follows the same wave the mono
  // grid rides, halftone-style: the ink is densest where the water is highest.
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
    // This screen's cell center, mapped back to frame space so it samples the
    // same wave field as everything else.
    vec2 cr = (floor(pr * Ns) + 0.5) / Ns;
    float wv = waveAt(Rt * cr, t, mp, pActive, mEcho);

    float rr = amt * (0.14 + 0.34 * (wv * 0.5 + 0.5));
    float mask = smoothstep(rr + aaS, rr - aaS, length(fract(pr * Ns) - 0.5));

    // Screen blend, like ink going down over what's already printed — color
    // lands on the dark ground and over the mono dots without ever clipping.
    // The envelope already drives the dot radius; only the tail end also fades
    // the ink, so a sounding note prints at full color and dies by its dots
    // shrinking away rather than by the whole screen going gray.
    vec3 ink = noteHue(uNoteFreqNorms[i]) * mask * min(1.0, amt * 1.9);
    col = 1.0 - (1.0 - col) * (1.0 - ink);
  }

  // Glow lifts the whole frame gently.
  col = clamp(col + mGlow * 0.05, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`;
