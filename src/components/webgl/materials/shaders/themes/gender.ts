import { NOTE_HUE_GLSL } from "./palette";

/**
 * Gender — a planet of dust on paper. A circle composed of thousands of dark
 * stippled particles, its interior a wrinkled terrain of creases, voids and
 * dense drifts that is being rearranged constantly — never the same crumple
 * twice. The rim is ragged, and filaments of dust escape it like weather.
 *
 * The pointer is a gravitational intruder: as the cursor approaches the disc,
 * the surface it nears pulls apart — plates of the terrain slide away from the
 * cursor by different amounts, a void opens under it, and the rim on that side
 * bulges and tears. Pull back and the disc settles whole again.
 *
 * Rendering is stochastic stipple, not geometry: a density field (warped fbm
 * masked to the disc) is dithered against per-pixel random thresholds, so tone
 * becomes particle count. Each grain re-rolls on its own slow, staggered
 * clock, so the visible motion is always the field drifting beneath a
 * near-still stipple — input speeds the field, never the grain.
 *
 * Macros:
 *   x  Width  — radius of the disc
 *   y  Drive  — density contrast / how hard the tones separate
 *   z  Wobble — resting churn: how much the terrain rearranges on its own
 *   w  Boom   — how much click / note input adds to the churn and the tearing
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
uniform float uNoteOn;
uniform float uVelocity;
uniform float uReactivity;
uniform vec4  uMacros;
uniform vec4  uNoteFreqNorms;
uniform vec4  uNoteAmts;

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

// Four octaves, rotated between octaves so the lattice never lines up into a
// readable grid.
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

  // Centered, aspect-corrected frame: the disc lives at the origin.
  vec2 p = vUv - 0.5;
  p.x *= aspect;

  // uShaderTime crawls at ~5% pace at rest and ramps under click / note input,
  // so the terrain's rearrangement accelerates when played. The small uTime
  // term keeps it from ever freezing solid.
  float t = uShaderTime * 0.42 + uTime * 0.015;

  // Instantaneous input energy — drives amplitude (speed comes from t).
  // Pointer motion is deliberately NOT an energy source here: the cursor acts
  // spatially (the pull-apart below), and letting its impulse agitate the
  // grain and churn made the whole frame shimmer-blur on every mouse move.
  float energy = clamp(
    uNoteOn * max(uVelocity, 0.4) + uClickImpulse * 0.8,
    0.0, 1.0
  ) * (0.5 + 0.5 * uReactivity);

  // Rises steeply off zero so a light keypress still lands.
  float hit = pow(energy, 0.6);

  float R = mix(0.24, 0.36, mWidth);

  // ── Pointer ───────────────────────────────────────────────────────────────
  // uPointer parks off-screen until the pointer first moves, so an untouched
  // page shows the planet whole and undisturbed.
  bool hasPointer = uPointer.x > -1.5;

  // The tear answers to the eased pointer, so the surface peels open behind
  // the cursor rather than snapping to it.
  vec2 m = uPointerLag * 0.5;
  m.x *= aspect;
  float md = length(m);

  // How close the cursor is to the disc: 0 far away, 1 at the rim or inside.
  // This is the master gain on everything the pointer does — approach and the
  // planet comes apart, retreat and it heals.
  float prox = hasPointer ? 1.0 - smoothstep(R * 0.25, R + 0.45, md) : 0.0;

  // ── Pull-apart ────────────────────────────────────────────────────────────
  // Content is displaced away from the cursor by sampling toward it. The
  // amount varies by a low-frequency plate mask, so the surface doesn't dilate
  // uniformly — different regions slide by different amounts and the seams
  // between them read as tears.
  vec2 q = p;
  vec2 toP = q - m;
  float dp = length(toP);
  if (hasPointer && dp > 1e-4) {
    float plate = fbm(q * 3.0 + t * 0.6);
    // Higher-frequency shred on top of the plates, so the tear's edge is
    // stringy and irregular instead of a clean circular lens.
    float shred = 0.4 + 0.6 * fbm(q * 6.5 - t * 0.4);
    float fall = smoothstep(0.55, 0.0, dp);
    // Baseline is deliberately generous: pointer motion no longer feeds the
    // energy term, so the tear must carry its full depth from proximity alone.
    float tear = prox * fall * (0.06 + 0.38 * plate) * shred
               * (1.35 + mBoom * hit * 1.8);
    // Each plate scatters at its own angle off the radial push — a straight
    // radial field reads as a lens dent; angled plates read as the surface
    // being taken apart and rearranged.
    float ang = (plate - 0.5) * 2.6;
    vec2 dir = toP / dp;
    q -= vec2(
      dir.x * cos(ang) - dir.y * sin(ang),
      dir.x * sin(ang) + dir.y * cos(ang)
    ) * tear;
  }

  // ── Churn ─────────────────────────────────────────────────────────────────
  // Two-pass domain warp that rearranges the interior. Rest amount from the
  // Wobble macro; input and cursor proximity both agitate it further.
  float churn = mix(0.5, 1.0, mWobble) + hit * mBoom * 1.8 + prox * 0.6;
  vec2 w1 = vec2(
    fbm(q * 1.8 + vec2(0.0, t)),
    fbm(q * 1.8 + vec2(5.2, -t * 0.8))
  ) - 0.5;
  vec2 w = q + w1 * 0.26 * churn;
  w += (vec2(
    fbm(w * 3.1 - vec2(t * 0.7, 1.3)),
    fbm(w * 3.1 + vec2(8.4, t * 0.5))
  ) - 0.5) * 0.12 * churn;

  // ── Density field ─────────────────────────────────────────────────────────
  // The silhouette gets its own, much gentler warp: enough that the rim
  // buckles and breathes, never enough to stop reading as a circle. The
  // pull-apart displacement is already in q, so the cursor still dents and
  // tears the outline at full strength. The interior texture rides the strong
  // warp above, which is what keeps the terrain rearranging inside a stable
  // silhouette.
  float r = length(q + w1 * (0.09 + 0.10 * hit * mBoom + 0.05 * prox));
  float body = 1.0 - smoothstep(R * 0.96, R * 1.06, r);

  // Interior terrain: broad light/dark drifts, with ridged creases folded in —
  // the dark filament lines that make it read as crumpled rather than cloudy.
  float tone = fbm(w * 2.2 - vec2(t * 0.15, t * 0.1));
  float crease = pow(1.0 - abs(2.0 * fbm(w * 3.4 + vec2(t * 0.4, -t * 0.25)) - 1.0), 3.0);

  // Denser toward the rim, like the screenshot's dark limb.
  float limb = smoothstep(R * 0.55, R * 0.95, r) * body;

  float density = body * clamp(
    0.42 + 1.15 * (tone - 0.5) + crease * 0.68 + limb * 0.25,
    0.0, 1.0
  );

  // Wisps: crease filaments allowed to leak past the rim into a halo band, so
  // dust appears to escape the planet.
  float halo = (1.0 - smoothstep(R * 1.0, R * 1.4, r)) * (1.0 - body);
  density = clamp(density + halo * crease * 0.8, 0.0, 1.0);

  // Contrast: Drive pushes mid-tones apart so voids empty and drifts blacken.
  density = pow(density, mix(1.6, 0.95, mDrive));

  // ── Stipple ───────────────────────────────────────────────────────────────
  // Tone becomes particle count: two grain layers (fine + 2px) dithered
  // against the density. Each grain re-rolls on its OWN staggered clock — a
  // per-pixel random phase offset — so at any instant only a sliver of the
  // dust is changing and there is never a frame-wide flash. At rest a grain
  // lives ~4s and the motion reads as the field drifting beneath a nearly
  // still stipple; input spins the clock way up, so a keypress or click
  // visibly liquefies the dust.
  // The grain lives on a FIXED virtual pixel grid, not gl_FragCoord: the
  // adaptive quality system resizes the render target under load, and a
  // fragment-space grain fully re-seeds on every resize — a visible
  // frame-wide jump whenever quality stepped (e.g. during the headline
  // entrance animation). On a virtual grid a resolution change merely
  // resamples the same particle pattern.
  //
  // The re-roll clock is CONSTANT, never input-driven. Speeding the grain up
  // under input made hits read as the image blurring, then snapping back to
  // crisp grain as the energy died — the stipple must look the same at every
  // energy level, with input expressed purely as the field moving faster
  // beneath it (uShaderTime ramp + churn above).
  float grainRate = 0.25;
  vec2 vp = vec2(vUv.x * aspect, vUv.y) * 1100.0;
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

  // Paper ground, dust-dark particles.
  vec3 paper = vec3(0.925);
  vec3 inkCol = vec3(0.10);

  // Input tints the dust with the colour of the key that caused it, keeping
  // the theme's violet for input with no note behind it. Scaled well down —
  // these are full-strength colours against near-black particles.
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

  // Vignette — kept light, it only has paper to work against.
  vec2 v = vUv - 0.5;
  v.x *= aspect;
  col *= 1.0 - smoothstep(0.45, 1.05, length(v)) * 0.10;

  // Grain — keeps the paper flats from banding.
  col += (rand(vec3(px, seed1 + 91.0)) - 0.5) * 0.03;

  gl_FragColor = vec4(col, 1.0);
}
`;
