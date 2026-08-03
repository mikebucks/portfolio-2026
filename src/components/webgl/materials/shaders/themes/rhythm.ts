import { NOTE_HUE_GLSL } from "./palette";

/**
 * Rhythm — a row of pendulum bobs hangs on hair-thin strings that leave the
 * top edge of the frame and spread edge to edge. Every bob swings left↔right in perfect
 * unison — they always reach their extremes at the same instant, so the row
 * reads as one shared pulse and never drifts into the order→chaos→order of a
 * classic pendulum wave. Laid over that shared swing is a second motion: each
 * bob rides up and down, but phase-offset column to column, so a wave travels
 * sideways through the row while the whole rack sways as one.
 *
 * "The measure of the swing to the right is the measure of the swing to the
 * left; rhythm compensates." Both motions are pure sines centred on their rest
 * position, so the swing is exactly equidistant left and right, and the wave
 * exactly equidistant up and down — the symmetry is guaranteed by construction,
 * at every instant, whatever the tempo or amplitude is doing. That guarantee is
 * the point of this theme; nothing below is allowed to break it.
 *
 * The keyboard drives the swing. uShaderTime is a monotonic phase clock that
 * advances faster while notes sound, so playing speeds the swing up without ever
 * stepping the phase backward — which is exactly why the sine stays symmetric no
 * matter how the tempo changes. A slow floor of real time sits under it so the
 * rack keeps a gentle sway at rest. Velocity opens the swing wider and lifts the
 * wave; each note flares the bobs.
 *
 * At rest the whole rack is monochrome: near-white bobs and 1px white strings
 * on near-black, high contrast and colourless. Colour belongs to the keyboard —
 * playing a note washes the shared palette across the row (warmed toward the
 * pitch sounding) and it drains back to white as the note decays. The bob cores
 * stay white-hot throughout; the colour rides their glow.
 *
 * Macros:
 *   x  Swing — lateral travel of the whole rack, css-relative
 *   y  Wave  — height of the travelling up/down wave
 *   z  Tempo — base rate of the swing/wave clock (notes accelerate it further)
 *   w  Glow  — bob brightness and how long the phosphor trail persists
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
uniform float uVelocity;
uniform float uEnvelope;
uniform float uReactivity;
uniform sampler2D uWave;
uniform vec4  uMacros;
uniform vec4  uNoteFreqNorms;
uniform vec4  uNoteAmts;
// Spring-eased formation amount from the render loop: 0 = resting wave, 1 =
// gathered into the mandala. Overshoots slightly past both ends (the spring),
// and holds near 1 for a beat after the last note so a quick note still reads.
uniform float uFormMorph;

${NOTE_HUE_GLSL}

// Number of pendulums in the row. Also the loop bound, so it must stay a
// compile-time constant — GLSL ES 1.0 won't take a uniform here.
const float NPEND = 26.0;
const float PI    = 3.14159265;
const float TAU   = 6.28318531;

// The up/down wave runs a little faster than the swing, so the travelling crest
// reads as its own motion against the shared sway rather than locking to it.
const float WAVE_SPEED = 1.5;

// One cycle of the synth's live output, repeat-wrapped, 0.5 == silence. Used to
// give each bob a little timbre-driven shimmer so the glow answers to the sound
// and not just the envelope.
float wave(float x) {
  return texture2D(uWave, vec2(x, 0.5)).r * 2.0 - 1.0;
}

// Distance from point p to segment a-b, for drawing a string as a thin capsule.
float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  vec2 ap = p - a;
  float h = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
  return length(ap - ab * h);
}

// The audio formation a bob morphs toward while notes sound: two concentric
// mandala rings that spin in opposite directions. Rather than mapping the top
// pivots to ring slots in order (which just fans the strings out), the pivots
// are paired OUTSIDE-IN and crossed: the far-left and far-right pivots go to
// adjacent slots straddling the top, then the next pair inward, and so on. The
// left pivot of each pair swings to the right of the ring and the right pivot to
// the left, so strings from opposite ends of the rail sweep across the centre
// and intersect — a symmetric string-art web. Pairs alternate between the two
// rings (even pairs → outer 14 dots, odd → inner 12), which counter-rotate.
vec2 formationPos(float i, vec2 C, float rIn, float rOut) {
  float last = NPEND - 1.0;                     // 25
  float p    = min(i, last - i);                // 0..12 pair index (0 = the ends)
  float side = i <= last - i ? -1.0 : 1.0;      // left pivot → right side, v.v.
  float outer = mod(p, 2.0) < 0.5 ? 1.0 : 0.0;  // even pairs ride the outer ring
  float q    = floor(p * 0.5);                  // the pair's index within its ring
  float cnt  = outer > 0.5 ? 14.0 : 12.0;       // dots on this ring
  float off  = (q + 0.5) * (TAU / cnt);         // symmetric offset from the top
  float r    = outer > 0.5 ? rOut : rIn;
  float dir  = outer > 0.5 ? -1.0 : 1.0;        // rings counter-rotate
  float ang  = PI * 0.5 + side * off + dir * uTime * 1.3;
  return C + r * vec2(cos(ang), sin(ang));
}

void main() {
  float mSwing = uMacros.x;
  float mWave  = uMacros.y;
  float mTempo = uMacros.z;
  float mGlow  = uMacros.w;

  float aspect = uResolution.x / uResolution.y;

  // Work in an isotropic space where one unit is one frame-height on both axes,
  // so bobs stay round and strings keep their thickness on any canvas. x runs
  // 0..aspect, y runs 0..1 with 0 at the bottom.
  vec2 P = vec2(vUv.x * aspect, vUv.y);

  // One device pixel expressed in P-units, so line widths can be set in pixels.
  float pxU = 1.0 / uResolution.y;

  // ── The shared clock ────────────────────────────────────────────────────────
  // One monotonic phase for the whole rack. The real-time floor keeps a gentle
  // sway alive at rest; uShaderTime carries the note-driven acceleration and,
  // being monotonic, only ever speeds the swing up or slows it — it never steps
  // the phase back, which is what keeps sin(phase) an exactly symmetric swing.
  float drive = 2.6 * (0.55 + 0.9 * mTempo);
  float phase = uTime * 0.78 + uShaderTime * drive;
  float wPhase = phase * WAVE_SPEED;

  // ── Input energy ────────────────────────────────────────────────────────────
  // Smoothed on the JS side (uEnvelope) plus the instantaneous strike, shaped so
  // the tail of a note still reads. Opens the swing, lifts the wave, and — as
  // colourAmt below — is the ONLY thing that brings colour into the frame.
  float energy = clamp(uNoteOn * max(uVelocity, 0.4) + uEnvelope * 0.7, 0.0, 1.4)
               * (0.5 + 0.5 * uReactivity);

  // Colour presence. Zero at rest → the rack is pure white; a note ramps it in
  // and it drains back as the note decays. Nothing but sounding notes moves it.
  float colorAmt = clamp(energy, 0.0, 1.0);

  // ── Rack geometry ───────────────────────────────────────────────────────────
  // Pivots sit on the very top edge and span the full width, so the outermost
  // strings reach the left and right edges of the canvas and every string runs
  // clear to the top. No rail — the strings simply leave the top edge.
  float pivotY = 1.0;                     // top edge of the canvas
  float restY  = 0.5;                     // baseline the bobs hang to and wave around (vertically centred)
  float sp     = aspect / (NPEND - 1.0);  // edge-to-edge spacing
  float x0     = 0.0;                     // first string on the left edge

  // Lateral travel of the WHOLE rack, identical for every bob (unison swing).
  // Because they all share it, the bobs translate as one rigid row and never
  // collide however wide the swing gets — so amplitude is set directly rather
  // than off the (now tighter) spacing, and stays visible at 26 across.
  float swingAmp = (0.045 + 0.05 * mSwing) * (1.0 + 0.6 * energy);
  float swingX   = swingAmp * sin(phase);

  // Height of the travelling wave and how tightly it's wound across the row.
  // WAVE_K holds ~2.5 wavelengths across the rack whatever NPEND is, so doubling
  // the count just samples the same wave more finely — a smoother sine of dots.
  float waveAmp = (0.055 + 0.09 * mWave) * (1.0 + 0.5 * energy);
  float WAVE_K  = TAU * 2.5 / NPEND;

  float bobR = 0.011;                      // bulb radius at full size (under the cursor)

  // Cursor in the isotropic P-space, for proximity-driven bulb sizing. uPointer
  // rests at its off-screen sentinel (-9,-9) until the first move, which lands
  // far from every bulb — so with no cursor the whole rack sits at minimum size.
  bool  hasPtr = uPointer.x > -1.5;
  vec2  ptrP   = vec2((uPointer.x * 0.5 + 0.5) * aspect, uPointer.y * 0.5 + 0.5);
  float reach  = 0.28;                      // spotlight radius the bulb size fades over

  // ── Audio formation ─────────────────────────────────────────────────────────
  // While notes sound the bobs leave the wave and gather into two counter-
  // spinning mandala rings, then melt back. The amount (with its hold-after-note
  // and spring overshoot) is computed in the render loop and arrives as
  // uFormMorph. The wave breaking (strings crossing) is intended.
  vec2  figC   = vec2(aspect * 0.5, 0.5);   // figure centre
  float figRin  = 0.19;                     // inner ring radius
  float figRout = 0.34;                     // outer ring radius
  float morph  = uFormMorph;
  float morphC = clamp(morph, 0.0, 1.0);    // clamped copy for size/trail

  // ── Accumulate the row ──────────────────────────────────────────────────────
  vec3  bobCol   = vec3(0.0);   // coloured glow (halo); cores are added white
  float coreLit  = 0.0;         // white-hot crisp discs
  float bobGlow  = 0.0;         // total, for the note flash
  vec3  trailCol = vec3(0.0);
  float filament = 0.0;

  // Where the sounding pitch(es) sit on the palette, so a played note warms the
  // whole ribbon toward that colour. Summed once, reused per bob.
  vec3  playAcc = vec3(0.0);
  float playW   = 0.0;
  for (int v = 0; v < 4; v++) {
    float a = uNoteAmts[v];
    if (a < 0.004) continue;
    playAcc += noteHue(uNoteFreqNorms[v]) * a;
    playW   += a;
  }
  vec3  playHue = playW > 0.001 ? playAcc / playW : vec3(0.0);
  float playAmt = clamp(playW, 0.0, 1.0) * 0.5;

  for (float i = 0.0; i < NPEND; i += 1.0) {
    float fi = i / (NPEND - 1.0);          // 0..1 across the row

    float px    = x0 + i * sp;
    vec2  pivot = vec2(px, pivotY);

    // Vertical wave: its own slightly faster clock, offset per column so the
    // crest travels. sin() keeps it exactly equidistant up/down.
    float wy      = waveAmp * sin(wPhase + i * WAVE_K);
    vec2  sineBob = vec2(px + swingX, restY + wy);

    // Blend from the resting wave toward the mandala. morph can overshoot past
    // 0 and 1 (the spring), so this extrapolates a touch beyond both ends.
    vec2  bob = mix(sineBob, formationPos(i, figC, figRin, figRout), morph);

    // Bulb size tracks cursor proximity: full radius when the cursor sits right
    // on the bulb, shrinking to an eighth as it moves away (and at rest, with no
    // cursor at all). A Gaussian spotlight keeps the falloff smooth.
    float pd    = hasPtr ? length(bob - ptrP) : 1e3;
    float prox  = exp(-(pd * pd) / (reach * reach));
    // Bulbs also bloom to full size while a formation is held, so the figure
    // reads as bright points rather than the resting pinpricks.
    float sizeK = max(mix(0.125, 1.0, prox), morphC);
    float br    = bobR * sizeK;

    // The glow colour: white at rest, ramping to the row's palette position
    // (warmed toward the pitch played) only as a note sounds. The crisp core is
    // kept white separately, so playing tints the halo, not the white-hot centre.
    vec3 ribbon = noteHue(fract(fi + uTime * 0.012));
    ribbon = mix(ribbon, playHue, playAmt);
    vec3 hue = mix(vec3(1.0), ribbon, colorAmt);

    // A touch of live-waveform shimmer, sampled at this bob's column, so the
    // glow carries the timbre and not just a smooth envelope.
    float shim = 1.0 + 0.18 * wave(fi + phase * 0.05) * (0.3 + energy);

    // --- string: ~1px white line from pivot to bob ---
    float ds = segDist(P, pivot, bob);
    float fl = 1.0 - smoothstep(0.6 * pxU, 1.6 * pxU, ds);
    filament += fl;

    // --- phosphor trail: a short dim arc of the bob's recent positions ---
    // Re-evaluate the bob at a few lagged phases; nearer samples are brighter.
    float sm = 0.0;
    for (float k = 1.0; k <= 3.0; k += 1.0) {
      float lp   = phase - k * 0.16;
      vec2  bp   = vec2(px + swingAmp * sin(lp),
                        restY + waveAmp * sin(lp * WAVE_SPEED + i * WAVE_K));
      float d    = length(P - bp);
      sm += exp(-k * 0.75) * exp(-d * d / (br * br * 4.0));
    }
    trailCol += hue * sm;

    // --- bob: white-hot crisp core + soft (tintable) halo ---
    // Disc form (1 - smoothstep) stays well-defined down to the eighth-size
    // bulb, where a fixed inner edge would invert.
    float d2   = length(P - bob);
    float aa   = 1.2 * pxU;
    float core = 1.0 - smoothstep(br - aa, br + aa, d2);
    float halo = exp(-d2 * d2 / (br * br * 2.5));
    coreLit  += core * shim;
    bobCol   += hue * halo * shim;
    bobGlow  += (core + halo) * shim;
  }

  // ── Compose ─────────────────────────────────────────────────────────────────
  vec3 BG  = vec3(0.030, 0.031, 0.038);
  vec3 col = BG;

  float glow = 0.55 + 0.9 * mGlow;

  col += vec3(1.0) * filament * 0.18;                 // strings, dim grey — lower
                                                      // contrast than the bobs

  col += trailCol * (0.05 + 0.06 * mGlow) * (1.0 - morphC); // smear (wave only)
  col += bobCol * (0.22 * glow);                      // coloured halos, faint
  col += vec3(1.0) * coreLit * 1.4;                   // white-hot cores

  // Note flash: a quick white lift on the bobs so a strike reads as a pulse of
  // light through the whole rack, then falls back with the envelope.
  col += vec3(1.0) * bobGlow * uNoteOn * max(uVelocity, 0.3) * 0.4
       * (0.5 + 0.5 * uReactivity);

  // Very gentle vignette — only the far corners fall off, so the rack can spread
  // to the edges without the outermost strings and bobs being dimmed away.
  vec2 vg = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
  float vign = 1.0 - smoothstep(0.85, 1.25, length(vg));
  col = mix(BG, col, 0.7 + 0.3 * vign);

  // Soft tone curve to tame the hottest cores without a hard clip.
  col = col / (1.0 + col * 0.28);

  // Subtle grain, lifted a little by input so a busy frame reads as alive.
  float grain = fract(sin(dot(gl_FragCoord.xy + uTime, vec2(12.9898, 78.233))) * 43758.5453);
  col += (grain - 0.5) * (0.02 + energy * 0.02);

  gl_FragColor = vec4(col, 1.0);
}
`;
