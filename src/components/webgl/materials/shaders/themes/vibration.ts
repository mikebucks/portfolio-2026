import { NOTE_HUE_GLSL } from "./palette";

/**
 * Vibration — three travelling strings crossing a dark field, each drawn from
 * one cycle of the synth's own live output rather than a sine. Each pair
 * encloses a solid band where their signs disagree, so the light lives in the
 * interference between the curves rather than on them. Two are tight ripples;
 * the third is a long, slow wave rolling under everything.
 * "Nothing rests; everything vibrates."
 *
 * The captured cycle is retained through silence, so clicks and pointer motion
 * drive the same waveform that the last note left behind. The cursor also
 * plucks — the strings are dragged toward it locally, hardest at the pointer's
 * own column — and clicks and notes throw a travelling wave packet down the
 * strings from where they landed, flaring the bands open.
 *
 * Greyscale at rest. Colour belongs to the keyboard: playing a note lifts the
 * bands into the shared note palette, tinted toward the pitch sounding, and
 * they fade back to grey as it decays. Two bands are solid fills with no
 * outlines — the light is the enclosed region itself — and the middle one cuts
 * back to the background colour, so crossings read as gaps and the layers stay
 * separable. The ground is a fixed dark grey: input drives the strings' shape
 * and motion, never the background.
 *
 * Five strings in all: a mid pair, a slow horizon, a fine ripple above and a
 * broad shelf below. Three of the enclosed bands add light and two cut back to
 * the ground — every layer added on one side has to be matched on the other, or
 * they only pile up toward white.
 *
 * Macros:
 *   x  Width  — string frequency, how many crossings fit across the frame
 *   y  Drive  — band edge sharpness and contrast
 *   z  Wobble — resting amplitude of the strings
 *   w  Boom   — how much click / note input flares and whips them
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

${NOTE_HUE_GLSL}

// One cycle of the synth's live output, repeat-wrapped, so x counts periods
// directly and the seam is exact. 0.5 is silence.
float wave(float x) {
  return texture2D(uWave, vec2(x, 0.5)).r * 2.0 - 1.0;
}

float rand(vec3 co) {
  return fract(sin(dot(co.xyz, vec3(12.9898, 78.233, 91.1743))) * 43758.5453);
}

// Band between two strings. Where a and b straddle zero the base exceeds 1 and
// the exponent blows it far past white — that overshoot is what fills the band
// solid. Clamped here rather than tonemapped later: left unclamped, three
// enormous values tinted and summed all saturate to the same white and the
// layers stop being tellable apart. Sharpness sets how hard the edge falls off,
// so a low exponent reads as a soft glow and a high one as a crisp lobe.
//
// max() guards the negative base out beyond the strings, where pow() is
// undefined — harmless in a mediump sketch, NaN on a highp full-screen quad.
float band(float a, float b, float sharp) {
  return clamp(pow(max(0.0, 1.0 - a * b), sharp), 0.0, 1.0);
}

// A palette hue turned into an additive primary: the common grey is subtracted
// out and what remains is normalized to full strength.
//
// The palette is built as a tint over luminance, so every stop carries energy
// in all three channels. Added together as-is, any two clear 1.0 in every
// channel and the field goes white — which is why the sketch's additive model
// needs near-primaries to work. Pulling the grey out leaves hues that still
// read as the palette's blue, cyan and amber but mix the way the sketch's
// channels do: pairs make a secondary, all three make white.
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

  // Aspect-corrected, so the strings keep their proportions on any canvas.
  // Not aspect-corrected: x runs 0..1 across the frame whatever its shape, so
  // the number of waves is fixed by design instead of multiplying on a wide
  // banner. The sketch reads straight off the fragment coordinate the same way.
  vec2 p = c;

  // Mostly the input-ramped clock, but with a floor of real time under it so
  // the long wave keeps rolling across the frame even when nothing is touching
  // it. On uShaderTime alone the resting pace is 5%, which reads as stopped.
  float t = uTime * 0.20 + uShaderTime * 1.1;

  // Instantaneous input energy, shaped so the tail of the decay still reads.
  float energy = clamp(
    uNoteOn * max(uVelocity, 0.4) + uClickImpulse * 0.8 + uPointerImpulse * 0.3,
    0.0, 1.0
  ) * (0.5 + 0.5 * uReactivity);
  float hit = pow(energy, 0.6);

  // Rest line the strings fan out from. Centred, so the stack sits on the
  // frame's horizontal axis and both halves of every wave are in view.
  float mid = 0.50;

  // ── Pluck ─────────────────────────────────────────────────────────────────
  // The strings are dragged toward the cursor, falling off sharply either side
  // of its column — a finger hooked under a wire rather than a global bend.
  // The eased pointer drives it so the strings trail the cursor with some
  // weight instead of snapping to it.
  bool hasPointer = uPointer.x > -1.5;
  // Left in the same unstretched 0..1 space as p.x, or the pluck would land
  // somewhere other than under the cursor.
  vec2 mp = uPointerLag * 0.5 + 0.5;
  float dx = p.x - mp.x;
  float pluck = hasPointer
    ? (mp.y - mid) * exp(-dx * dx * 26.0) * (0.55 + 0.45 * uPointerImpulse)
    : 0.0;

  // ── Strike ────────────────────────────────────────────────────────────────
  // A click or note throws a wave packet outward from where it landed, riding
  // real time so it travels at its own pace regardless of the ambient clock.
  vec2 cp = uClickPos * 0.5 + 0.5;
  float cdx = p.x - cp.x;
  float strike = sin(cdx * 26.0 - uTime * 9.0)
               * exp(-cdx * cdx * 14.0) * uClickImpulse * 0.5;

  // ── Strings ───────────────────────────────────────────────────────────────
  // Excitation. Notes, clicks and pointer motion all feed the same term, so
  // the captured waveform answers to any of the three — the retained cycle is
  // still there to be driven long after the sound that produced it decayed.
  float excite = clamp(hit + uEnvelope * 0.6, 0.0, 1.5);
  // The sketch's own proportions: ~0.2 of frame height for the outer two
  // strings, half that for the tight one.
  float amp = mix(0.15, 0.26, mWobble) * (1.0 + 0.35 * excite);
  float bend = pluck * 0.45 + strike * 0.22;

  // Cycles across the whole frame, matching the sketch's 30 / 50 / 2 radians
  // over an unstretched 0..1 x. Deliberately not aspect-corrected — the sketch
  // reads straight off the fragment coordinate, so the count is fixed by design
  // rather than growing with the window.
  float cyc = mix(3.2, 6.5, mWidth);
  float slow = mix(0.22, 0.45, mWidth);

  // Per-pixel jitter on the sample height, re-rolled ~24x/s. Displacing where
  // the field is read rather than tinting the result afterwards is what makes
  // the edges dissolve into grain instead of sitting under a layer of it — the
  // same reason Gender's stratified sampling reads as noisy rather than
  // filtered. Grows with input, so a note visibly roughens the bands.
  float grit = mix(0.006, 0.018, mWobble) + excite * 0.020;
  float py = p.y + (rand(vec3(gl_FragCoord.xy, floor(uTime * 24.0))) - 0.5) * grit;

  // Slow amplitude envelopes, one per string, so successive crests differ in
  // height instead of every peak matching its neighbours. Low frequency and
  // slow drift, well under the strings' own rates, so it reads as the line
  // breathing rather than as one more ripple. Each is offset in phase and rate
  // so the three never swell together.
  // Whether a bright crest shows is a race between two envelopes, not one: hr
  // bounds both bright bands, while hg and hb bound the dark ones, so a crest
  // is buried whenever hr's envelope dips at the same moment theirs swell. Both
  // ends are pinned — envR's floor lifted so it never collapses, and the two
  // dark-bounding ceilings capped at 1.0 so they cannot reach as high as hr's
  // weakest peak. The other two keep their full range.
  float envR = 0.95 + 0.25 * wave(p.x * 0.41 + t * 0.09);
  float envG = 0.66 + 0.34 * wave(p.x * 0.67 - t * 0.07 + 0.31);
  float envB = 0.62 + 0.38 * wave(p.x * 0.23 + t * 0.05 + 0.62);
  float envD = 0.72 + 0.48 * wave(p.x * 0.83 - t * 0.11 + 0.19);
  float envE = 0.72 + 0.48 * wave(p.x * 0.17 + t * 0.04 + 0.44);

  // Rest lines fanned apart rather than stacked on one baseline, so each band
  // occupies its own strip. Amplitudes still overrun the gaps, so the strings
  // keep crossing — the separation is in where they sit, not a promise that
  // they never meet.
  float fan = mix(0.03, 0.075, mWobble);

  // Five strings, extending the existing three outward rather than crowding
  // between them: hd is a fine fast ripple riding above the pair, he a deeper
  // and slower horizon below. Both read off the same wave texture and the same
  // clock, so they drift with everything else.
  // hr swings wider than the rest on purpose: it is the shared edge of both
  // bright bands, so its crest is what has to clear the dark shapes bounded by
  // hg and hb. Raising the two bright bands directly would only widen them
  // downward as well.
  float hr = py - (wave(p.x * cyc        - t * 0.95) * amp * 1.35 * envR + mid             + bend);
  float hg = py - (wave(p.x * cyc * 1.67 - t * 1.20) * amp * 0.5  * envG + mid + fan       + bend);
  float hb = py - (wave(p.x * slow       - t * 0.85) * amp        * envB + mid - fan * 0.8 + bend * 0.6);
  float hd = py - (wave(p.x * cyc * 2.60 - t * 1.45) * amp * 0.28 * envD + mid + fan * 1.9 + bend);
  float he = py - (wave(p.x * slow * 0.6 + t * 0.55) * amp * 0.75 * envE + mid - fan * 2.1 + bend * 0.4);

  // Drive tightens the edges; input softens them into a flare. Back near the
  // sketch's 1000 / 100: the split is the point, one crisp band reading as a
  // shape against two soft ones reading as glow. Making all three crisp lost
  // the glow that surrounds the lobes in the original.
  float flare = 1.0 - 0.5 * mBoom * hit;
  float sharpA = mix(700.0, 1600.0, mDrive) * flare;
  float sharpB = mix(70.0, 170.0, mDrive) * flare;

  float fr = band(hr, hg, sharpA);
  float fg = band(hg, hb, sharpB);
  // Clamped after the boost, not before. In the sketch this band is pure blue,
  // so doubling it just pins the blue channel and the hue is unchanged; doubling
  // a hue with energy in two channels shifts it instead — amber turns yellow.
  // Clamping keeps the brightening as a widening of the solid region only.
  float fb = clamp(band(hb, hr, sharpB) * 2.0, 0.0, 1.0);

  // The two new bands. fd is crisper than anything else and enclosed by the two
  // fastest strings, so it stays a thin filigree along the top — detail, not
  // another slab. fe is the softest, a broad shelf under the horizon, and it
  // cuts rather than adds so the bottom gains an edge without gaining light.
  float fd = band(hd, hg, sharpA * 1.3);
  float fe = band(he, hb, sharpB * 0.8);

  // ── Colour ────────────────────────────────────────────────────────────────
  // The one constant in the frame. Everything else is drawn as a departure from
  // it and returns to exactly this value.
  vec3 ground = vec3(0.072, 0.073, 0.082);

  // Resting greys. Not the luminance of the colours they replace — violet is a
  // very dark colour (~0.10) and would all but vanish against the ground, while
  // amber (~0.65) would leave their overlap clipped at white. Levels are chosen
  // so every combination that can occur lands somewhere different, with the new
  // filigree taking the smallest step so adding it doesn't push the brightest
  // stack into clipping.
  vec3 greyA = vec3(0.28);
  vec3 greyC = vec3(0.50);
  vec3 greyD = vec3(0.12);

  // Violet, amber and teal, turned into additive primaries so a pair mixes to a
  // secondary the way the sketch's channels do. Chosen for spread once turned
  // into primaries — the palette is cool-heavy, so its middle stops all reduce
  // to much the same cyan.
  vec3 hueA = greyA;
  vec3 hueC = greyC;
  vec3 hueD = greyD;

  // Colour is carried entirely by sounding notes: the field is greyscale at
  // rest and rises into hue as keys are played, fading back as they decay.
  // Driven by uNoteAmts alone, so clicks and pointer motion move the strings
  // without tinting them.
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
    // Each band keeps its own hue, pulled part of the way toward the pitch
    // being played — all the way and the two would converge, losing the
    // secondary that makes their crossing legible.
    vec3 played = primary(acc / wsum);
    vec3 colA = mix(primary(noteHue(0.02)), played, 0.35);
    vec3 colC = mix(primary(noteHue(0.78)), played, 0.35);
    vec3 colD = mix(primary(noteHue(0.50)), played, 0.35);
    hueA = mix(greyA, colA, chroma);
    hueC = mix(greyC, colC, chroma);
    hueD = mix(greyD, colD, chroma);
  }

  // Three bands add over the ground; two cut back to it. Purely additive layers
  // could only ever pile up, so wherever they all met the sum clipped to white
  // and the busiest part of the frame carried the least information. Cutting
  // makes those crossings read as gaps instead, which is what separates the
  // layers — and it is why the two new ones go in one of each, rather than both
  // adding more light to the same place.
  //
  // The additive bands keep their full strength — scaling them down changes what
  // colour they are, not just how bright.
  vec3 col = ground;
  col += hueA * fr;
  col += hueC * fb;
  col += hueD * fd;
  col = mix(col, ground, fg);
  // A shade short of a full cut, so the lower shelf reads as depth rather than
  // as a second hole punched through the field.
  col = mix(col, ground, fe * 0.85);

  col = clamp(col, 0.0, 1.0);

  // Vignette applied to the lit part only. Multiplying the whole frame would
  // shade the ground toward the corners, and the ground is meant to be one
  // constant dark grey — nothing, input included, moves it.
  vec2 v = c - 0.5;
  v.x *= aspect;
  col = ground + (col - ground)
      * (1.0 - smoothstep(0.45, 1.05, length(v)) * 0.3);

  // Grain on top of the displacement jitter, scaled by how far a pixel is off
  // the ground so the bands stay dithered and the flat background stays flat.
  // Also rises with input, alongside the roughening of the edges above.
  float lit = clamp(length(col - ground) * 3.0, 0.0, 1.0);
  float grain = 0.045 + excite * 0.05;
  col += (rand(vec3(gl_FragCoord.xy, floor(uTime * 20.0) + 7.0)) - 0.5)
       * grain * lit;

  gl_FragColor = vec4(col, 1.0);
}
`;
