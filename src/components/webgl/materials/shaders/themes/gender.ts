/**
 * Gender — a dark square on white that leans and smears as a wave passes
 * through it. Two principles in one frame: a hard geometric form and the
 * formless field it dissolves into. At rest the wave crawls and the edge is
 * soft; click or play a note and the smear streaks across the frame.
 *
 * The square never spins. Whichever of its four corners sits in the cursor's
 * quadrant strains out to reach for it, and the square turns to follow the
 * cursor within that quadrant — geared to ±14° and driven by an eased copy of
 * the pointer, so it swings after the cursor rather than locking to it.
 * Crossing an axis hands the strain to the neighbouring corner and the square
 * drifts into its new resting angle. It also grows toward 2× as the cursor
 * pulls away — and as it grows it dissolves, warping and fuzzing out of a
 * recognisable square into an abstract field.
 *
 * Macros:
 *   x  Width  — half-extent of the square
 *   y  Drive  — edge gamma / contrast
 *   z  Wobble — resting lean and blur
 *   w  Boom   — how much click / note input adds to the lean and smear
 */
export const genderFragment = /* glsl */ `
precision highp float;

#define M_PI 3.141592653589793
#define NUM_SAMPLES 32

varying vec2 vUv;

uniform float uTime;
uniform float uShaderTime;
uniform vec2  uResolution;
uniform vec2  uPointer;
uniform vec2  uPointerLag;
uniform float uSquareRot;
uniform float uPointerImpulse;
uniform vec2  uClickPos;
uniform float uClickImpulse;
uniform float uNoteOn;
uniform float uVelocity;
uniform float uReactivity;
uniform vec4  uMacros;

float rand(vec3 co) {
  return fract(sin(dot(co.xyz, vec3(12.9898, 78.233, 91.1743))) * 43758.5453);
}

// Square silhouette. Sheared horizontally by k in screen space, then turned
// into the square's own frame by rc = vec2(cos, sin) of the follow angle.
// Shearing before rotating keeps the lean screen-vertical regardless of turn.
//
// cdir is the local diagonal of the corner in the cursor's quadrant and pull
// is how far that corner travels toward the cursor, both in the square's
// frame. The spatial weight peaks hard along cdir, so only that corner moves —
// the other three stay planted.
//
// abst (0..1) dissolves the shape as it grows: the boundary metric slides off
// the max-norm that makes a square into a plain radius, so the corners stop
// being corners. Paired with the domain warp in main(), which does the rest.
//
// Returns 0 inside, 1 outside.
float fetch(vec2 uv, float k, float half_, vec2 rc, vec2 cdir, vec2 pull,
            float abst) {
  vec2 p = uv - vec2(0.5);

  p.x -= p.y * k;
  p = vec2(rc.x * p.x + rc.y * p.y, rc.x * p.y - rc.y * p.x);

  float l = length(p);
  float w = l > 1e-5 ? max(0.0, dot(p / l, cdir)) : 0.0;
  float w2 = w * w;
  w = w2 * w2 * w2;
  p -= pull * w;

  vec2 d = abs(p);
  float edge = mix(max(d.x, d.y), length(p) * 0.82, abst * 0.55);
  return step(0.0, edge - half_);
}

// Golden-angle spiral — even angular coverage of the disc.
vec2 offset_spiral(float x) {
  float a = x * 2.0 * M_PI * 0.3819444 * 521.0;
  return vec2(cos(a), sin(a)) * pow(x, 1.0 / 1.618);
}

void main() {
  float mWidth  = uMacros.x;
  float mDrive  = uMacros.y;
  float mWobble = uMacros.z;
  float mBoom   = uMacros.w;

  vec2 c = vUv;
  float aspect = uResolution.x / uResolution.y;

  vec2 uv = c;
  uv -= 0.5;
  uv.x *= aspect;
  uv += 0.5;

  // uShaderTime is integrated by the render loop at ~5% of full pace at rest
  // and ramps to full pace under click / note input, so this single phase gives
  // the slow ambient drift and the input speed-up for free.
  float t = uShaderTime * 0.7;

  // Instantaneous input energy — drives amplitude (speed comes from t).
  float energy = clamp(
    uNoteOn * max(uVelocity, 0.4) + uClickImpulse * 0.8 + uPointerImpulse * 0.25,
    0.0, 1.0
  ) * (0.5 + 0.5 * uReactivity);

  // Shaped for the hit: rises steeply off zero so a light keypress still lands,
  // where the linear value spent most of its decay too small to notice.
  float hit = pow(energy, 0.6);

  float baseHalf = mix(0.12, 0.30, mWidth);

  // ── Pointer tracking ──────────────────────────────────────────────────────
  // uPointer is -1..1 and parks off-screen until the pointer first moves, so
  // an untouched page shows a still, rest-size square.
  bool hasPointer = uPointer.x > -1.5;

  // The square answers to the eased pointer, so it swings after the cursor
  // instead of locking to it. The proximity smudge below uses the live one.
  vec2 m = uPointerLag * 0.5;
  m.x *= aspect;
  float md = length(m);

  vec2 mLive = uPointer * 0.5;
  mLive.x *= aspect;

  // Grow toward 2× as the cursor pulls away. Measured from the square's edge,
  // so it stays at rest size while the cursor is still over it.
  float reach = hasPointer ? clamp((md - baseHalf) / 0.55, 0.0, 1.0) : 0.0;
  float half_ = baseHalf * (1.0 + reach);

  // Which corner is attracted: the sign of the cursor's offset picks the
  // quadrant, so crossing an axis hands off to a different physical corner.
  vec2 qs = hasPointer ? sign(m) : vec2(0.0);
  float ql = length(qs);
  vec2 cdir = ql > 0.5 ? qs / ql : vec2(0.0);

  // Fade everything pointer-driven out near the centre, where the angle is
  // ill-defined and the square would otherwise thrash.
  float grip = hasPointer ? smoothstep(0.0, 0.06, md) : 0.0;

  // Turn to follow the cursor within the quadrant: the angle from the attracted
  // corner's rest diagonal to the cursor, geared below 1 so the square can
  // never track far enough to become its own 90° rotation. That gearing is
  // what makes the handoff visible — at the axis the target angle resets from
  // one extreme to the other and the strain jumps to the neighbouring corner.
  //
  // Eased in the render loop, not here: a fragment shader has no state to
  // carry across frames, so the reset would land as a hard snap. uSquareRot
  // arrives already drifting toward the new resting angle.
  float rot = uSquareRot;
  vec2 rc = vec2(cos(rot), sin(rot));

  // The cursor and the attracted corner, both in the square's turned frame.
  vec2 mL = vec2(rc.x * m.x + rc.y * m.y, rc.x * m.y - rc.y * m.x);
  vec2 pull = (mL - qs * half_) * mix(0.25, 0.5, reach) * grip;

  // ── Motion ────────────────────────────────────────────────────────────────
  // Travelling wave. Signed and continuous, so the square leans one way,
  // passes back through upright, and leans the other — no jump at the wrap.
  float wave = sin((uv.y + t) * M_PI);

  // Single shear angle for the whole shape: one leaning square, not a scatter.
  float skew = wave * (mix(0.12, 0.45, mWobble) + mBoom * hit * 0.85);

  // Cursor proximity smudge — a local blur centred on the pointer, strongest
  // when the cursor is right up against the square, so the nearest part of the
  // edge goes soft while the far side stays crisp.
  float close = hasPointer ? 1.0 - reach : 0.0;
  float near = 1.0 - smoothstep(0.0, half_ * 1.8, length(uv - (vec2(0.5) + mLive)));

  // ── Abstraction ───────────────────────────────────────────────────────────
  // Squared so it stays out of the way until the square is genuinely large,
  // then comes on hard: past that point it should stop reading as a square
  // being scaled and start reading as a field.
  float abst = reach * reach;

  // Domain warp, applied once per fragment rather than per sample. The whole
  // rendered image — blur included — is warped together, which is both far
  // cheaper than warping inside the loop and more coherent, since the smear
  // bends along with the shape. Two octaves: the low one buckles the outline,
  // the high one folds it hard enough to pinch off lobes near the corners.
  vec2 q = uv - vec2(0.5);
  float pt = uShaderTime * 0.35;
  vec2 warp = vec2(
    sin(q.y * 15.3 + pt) + 0.5 * sin(q.x * 31.7 - pt * 1.4),
    sin(q.x * 13.9 - pt * 0.8) + 0.5 * sin(q.y * 29.1 + pt * 1.2)
  );
  // Hash-driven per-fragment jitter on top, so the folds are irregular rather
  // than a readable sine lattice.
  warp += (vec2(rand(vec3(q * 61.0, 7.0)), rand(vec3(q * 61.0, 19.0))) - 0.5);
  vec2 suv = uv + warp * abst * 0.10;

  // Blur radius, in units of screen height. The wave term keeps it breathing
  // at rest; the input term is ungated so a keypress smears the whole frame;
  // the last fuzzes the shape out as it dissolves.
  float blur = mix(0.005, 0.014, mWobble)
             + abs(wave) * mix(0.022, 0.075, mWobble)
             + hit * mBoom * 0.12
             + close * near * 0.15
             + abst * 0.035;

  float f = 1.0 / float(NUM_SAMPLES);
  // Per-pixel seed, re-rolled ~20×/s so the grain stays alive even when the
  // field is nearly frozen at rest.
  float seed = rand(vec3(uv, floor(uTime * 20.0)));

  float color = 0.0;
  for (int i = 0; i < NUM_SAMPLES; ++i) {
    float fi = float(i);
    // Stratified jitter: each sample gets its own random position inside its
    // slice of the spiral. A single shared offset (as in the source sketch)
    // leaves all samples on one ring, which is what breaks a wide radius into
    // discrete ghost squares.
    float j = (fi + rand(vec3(uv * 311.0, fi + seed * 53.0))) * f;
    vec2 off = offset_spiral(j) * blur;
    // Stretch along the shear so the smear reads as motion, not a glow. Input
    // stretches it much further: a hard directional streak is what separates a
    // hit from the shape's own soft, radial dissolve, which a bigger radius
    // alone would just blend into.
    off.x *= 1.0 + abs(skew) * 1.5 + hit * 3.2;
    color += fetch(suv + off, skew, half_, rc, cdir, pull, abst);
  }

  color = pow(clamp(color * f, 0.0, 1.0), mix(1.6, 3.0, mDrive));

  // White ground, dark shape.
  vec3 col = vec3(color);

  // Input tints the shape so a keypress reads as a flash.
  col += vec3(0.10, 0.02, 0.16) * hit * (1.0 - color);

  // Vignette — kept light, it only has white to work against.
  vec2 v = c - 0.5;
  v.x *= aspect;
  col *= 1.0 - smoothstep(0.45, 1.05, length(v)) * 0.10;

  // Grain — keeps the flats from banding.
  col += (rand(vec3(gl_FragCoord.xy, floor(uTime * 20.0))) - 0.5) * 0.03;

  gl_FragColor = vec4(col, 1.0);
}
`;
