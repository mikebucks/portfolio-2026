/**
 * Polarity — a horn torus drawn by two mirrored streams of particles.
 *
 * "Everything is dual." The horn torus is the case where the tube radius equals
 * the ring radius, so the hole closes to a single point: every poloidal circle
 * on the surface passes through the same place at the centre of the figure.
 * That point is the subject. Particles leave it in two streams — one climbing
 * through the middle, over the top and down the outside, the other dropping
 * through the middle, under the bottom and up the outside. Same count, same
 * speed, same spacing, exact mirror images through the horizontal plane at
 * every instant. They cross again at the outer equator, change places, and
 * arrive back at the centre together. Neither leads; neither exists alone.
 *
 * Nothing draws the torus but the particles. There is no surface, no wireframe,
 * no silhouette underneath — the form is only ever inferred from where the
 * streams currently are, so it is continuously being drawn and continuously
 * fading behind itself.
 *
 * The camera. At rest it is locked head-on, level with the equator, which is
 * the view the shape is usually drawn in: two lobes meeting at a waist, the
 * poloidal circles nested inside them, the mirror between top and bottom
 * exact. Strike a note and it swings overhead — the lobes open out into a disc
 * and the two streams, which are separated only by height, converge into one.
 * Seen from above the polarity is invisible. As the note dies the camera
 * settles back and the two part again. The swing is eased in the render loop
 * (uViewTilt); a note lands as a step and a fragment shader has no state to
 * smooth one with.
 *
 * Construction. The torus is cut into RINGS poloidal circles, each of which
 * projects to an ellipse. Because the tube and ring radii are equal, the
 * ellipse's radial axis is exactly its own centre vector, so a point on it is
 * A·(1 − cos v) plus a vertical term — the whole ring is a scaling of one
 * vector away from the origin, which is the horn torus's defining property
 * falling out of the algebra.
 *
 * The mirror pair costs nothing: the streams sit at v = π ∓ a, and since
 * cos(π ∓ a) = −cos a while sin(π ∓ a) = ±sin a, both share a base point and
 * differ only in the sign of the vertical term. The symmetry is structural
 * rather than two calculations that have to keep agreeing.
 *
 * No trig runs per particle at all. Every angle in the frame — ring to ring,
 * and step to step down a wake — is a fixed increment, so the whole population
 * is walked by rotating a unit vector, two multiplies a step. Six sin/cos pairs
 * at the top of main() cover all 840 particles.
 *
 * Macros:
 *   x  Scale  — size of the figure against the frame
 *   y  Flow   — circulation speed
 *   z  Spiral — per-ring stagger; 0 fires every ring together, higher twists
 *               the wavefront into a helix
 *   w  Bloom  — particle size and overall gain
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

// Poloidal circles around the tube. Head-on, rings at u and −u project to the
// same curve — the front and back of the surface land on top of each other, as
// they do in any straight-on drawing of the shape — so twenty-eight reads as
// fourteen nested loops per lobe. Overhead they separate into twenty-eight
// spokes.
#define RINGS 28

// Each stream is one head per ring, towing a wake that reaches the whole way
// round the tube. One head, not several: the eye should be able to pick a
// single particle out of the centre and follow it all the way round, with its
// opposite number tracking it through the other half of the frame.
//
// The wake is walked in two segments at different rates, because its two ends
// do different jobs. The near end is the line being drawn — it wants particles
// close enough together to read as a stroke rather than as beads. The far end
// only has to say "the ring continues through here", and spending the same
// density on it both costs three times as much and buries the head in clutter.
// So: a dense bright head, then a sparse fading remainder that closes the ring.
#define HEAD  10
#define GHOST 5

const float TAU = 6.283185307;
const float DU = TAU / float(RINGS);
// About five percent of a screen height between one particle and the next along
// the stroke, which is also roughly the gap between neighbouring rings — so the
// two families lay down a square-ish lattice rather than a set of stripes.
const float DA_HEAD = 0.122;
// Whatever is left of the tube after the head, spread over the ghost samples,
// so the wake closes on itself exactly.
const float DA_GHOST = (TAU - float(HEAD) * DA_HEAD) / float(GHOST);
// Weak perspective: everything is scaled about the centre by its own depth.
// Cheaper than a real divide and, since the figure is centred, geometrically
// honest — it is what a pinhole camera does to first order.
const float PERSP = 0.30;
// Camera elevation at the two ends of the swing. Not quite overhead at the top:
// the last few degrees flatten every ring into a straight radial spoke, and the
// figure stops being a drawing of a solid.
const float TILT_REST = 0.045;
const float TILT_OVER = 1.30;

// Per-ring context. Globals rather than a dozen arguments, since the splat is
// called from both wake segments and GLSL has no closures.
vec2  gQ;
vec2  gA;
float gCz, gZa, gZc;
float gSu, gCosT, gSinT, gInvZ;
float gHalo;
float gUp, gDn;

// One step of the wake: the mirror pair at tube angle v = π ∓ a, given
// (cos a, sin a).
void splat(float ca, float sa, float w, float kk) {
  // On a horn torus the ring's radial axis is its own centre vector, so the
  // whole circle is A scaled between 0 and 2 — and at ca = 1 both particles sit
  // exactly on the origin, which is where every ring on the figure meets.
  float s = 1.0 - ca;
  vec2 base = gA * s;
  float zb = gZa * s;
  float oy = gCz * sa;
  float zo = gZc * sa;

  // Every ring on the figure meets at the origin, so the particle density there
  // is RINGS times what it is anywhere else. At the excited size that piles
  // fifty-six overlapping discs onto one spot and the waist blows out into a
  // featureless blob. Tapering the core as they converge holds it to a point of
  // light — which is what the waist of a horn torus is.
  kk *= 1.0 + 1.1 * (1.0 - min(s, 1.0));

  // Which way the tube's surface faces here: the outward normal
  // (cos v·cos u, sin v, cos v·sin u) against the view direction (0, sinT,
  // cosT). Without it a wireframe torus is a genuinely ambiguous drawing —
  // front and back read alike and the eye can flip the form inside out. The far
  // surface is sunk rather than culled, so the back stays as a ghost and the
  // whole thing reads as a transparent volume instead of a cut-out.
  //
  // Both cues are deliberately gentle. Pushed hard they resolve the form
  // perfectly and destroy the point of it: once the camera is up, the stream
  // going over the top is on the visible surface for most of its circuit while
  // its opposite number is underneath, and a strong depth sort turns two equal
  // halves into a bright one and a hidden one.
  float fBase = -ca * gSu * gCosT;
  float fSide = sa * gSinT;

  // The core falls off as the fourth power of distance and is spent within a
  // few of its own radii. The halo falls off as the square, which is slow
  // enough that eight hundred of them sum to a real haze hundreds of pixels
  // out — and since the ring cull stops that sum dead at its own boundary, the
  // haze arrived with a rim on it, a soft disc of light drawn across the frame.
  // Subtracting a floor gives the halo a finite reach instead, and because the
  // floor is in units of the falloff rather than of distance, that reach scales
  // with the particle: it stays a fixed multiple of whatever size they are.
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

  // y-normalised, centred on the figure: y spans ±0.5, x spans ±0.5·aspect.
  vec2 q = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

  // The figure stands a full screen height tall, and head-on it is twice as
  // wide as it is high, so on anything narrower than 2:1 — which is every
  // screen — the lobes run off the sides. That is the point: it is a full-bleed
  // background, and a form cropped by the frame reads as bigger than the frame.
  // Below square, though, the crop would eat everything but the waist, so the
  // working space shrinks with the width from there down. Shrinking the space
  // rather than the geometry scales the particle cores with it, so it stays the
  // same drawing at any viewport shape.
  float fit = clamp(aspect, 0.5, 1.0);
  q /= fit;

  // A key press fires both channels — the note impulse and, at reduced
  // strength, a click. Weighting the click term by uClickStrength lets a bare
  // mouse click land at the same magnitude as a key press. Pointer motion is in
  // here too, weakly: any event should show on the particles.
  float energy = clamp(
    uClickImpulse * uClickStrength * 1.15
      + uNoteOn * max(uVelocity, 0.4)
      + uPointerImpulse * 0.20,
    0.0, 1.0
  ) * (0.5 + 0.5 * uReactivity);
  // Below 1 rather than above: unlike a swell that has to get out of the way,
  // this drives size, and size wants to be visible for the whole of the event
  // rather than only at its peak. Not as far below as a square root, which
  // lifted the particles most of the way to their excited size on nothing more
  // than a mouse drift, and left the resting state hardly ever on show.
  float hit = pow(energy, 0.65);

  // ── Camera ────────────────────────────────────────────────────────────────
  // Locked head-on, level with the equator, until a note lifts it overhead.
  // Eased in the render loop off the note envelope, so this is also the
  // shader's answer to "is a note sounding, and how hard" — the one signal that
  // separates a key press from the mouse. Colour rides it too.
  float note = clamp(uViewTilt, 0.0, 1.0);
  // Smoothstepped so both ends of the swing settle rather than arrive.
  float view = note * note * (3.0 - 2.0 * note);
  float tilt = mix(TILT_REST, TILT_OVER, view);
  float cosT = cos(tilt);
  float sinT = sin(tilt);

  // Sized so the head-on figure stands exactly a screen height tall, weak
  // perspective included. Overhead it presents its full width in both axes
  // instead of one, which is twice as much figure, so the camera pulls back by
  // half as it rises and the disc arrives at the same height it left.
  float rad = mix(0.385, 0.455, mScale) * mix(1.0, 0.52, view);

  // Constant spin off raw uTime. The cursor nudges it — it no longer touches
  // the elevation, which is the note's alone.
  bool hasPointer = uPointer.x > -1.5;
  float spin = uTime * 0.075 + (hasPointer ? uPointerLag.x * 0.5 : 0.0);

  // ── Flow ──────────────────────────────────────────────────────────────────
  // Distance of the lead particle from the centre, in radians of tube angle.
  // Two clocks summed: uTime carries the ambient drift at a constant rate, and
  // uShaderTime — integrated by the render loop at a twentieth of pace at rest
  // and full pace under input — carries the surge. Their sum is monotonic, so
  // the stream can quicken by a factor of five on an event and slow back down
  // without ever stepping backwards.
  float flow = (uTime * 0.38 + uShaderTime * 2.42) * mix(0.72, 1.30, mFlow);
  // Rings fire out of step by this much. At zero every ring is at the same tube
  // angle, so the wavefront is itself a horizontal circle — one of the torus's
  // own parallels — climbing the surface, which is the clearest possible read
  // of the shape. Stagger tips those circles into a helix; past a fraction of a
  // ring gap the wavefront stops being a curve at all and the form dissolves
  // into unrelated arcs, so the useful range is small.
  float stagger = DU * mix(0.0, 0.55, mSpiral);

  // Every angle below is reached by rotating a unit vector through a fixed
  // increment. These six pairs are the only transcendentals in the shader —
  // nothing inside the loops calls one.
  float cdu = cos(DU),        sdu = sin(DU);
  float cst = cos(stagger),   sst = sin(stagger);
  float cdh = cos(-DA_HEAD),  sdh = sin(-DA_HEAD);
  float cdg = cos(-DA_GHOST), sdg = sin(-DA_GHOST);
  float cu  = cos(spin),      su  = sin(spin);
  float ch  = cos(flow),      sh  = sin(flow);

  // Particle core, as an inverse squared radius — so larger is smaller. Stated
  // against the figure's own radius rather than the screen, so the particles
  // stay the same fraction of the drawing at any size and shrink with it as the
  // camera pulls back. At rest they are pinpricks with almost no skirt on them,
  // a bit over a hundredth of the figure across; an event swells them nearly
  // threefold and lets the skirt out into a glow. The two move together on
  // purpose: size alone reads as a zoom, glow alone reads as a fade.
  float spread = mix(6400.0, 900.0, hit)
               / (rad * rad * mix(1.0, 0.62, mBloom));
  gHalo = 0.04 + 0.36 * hit;

  // A ring runs from the origin out to 2A and never strays further from that
  // line than the tube's own half-height, so the shape to reject against is a
  // capsule along the segment, not a circle around its middle. It matters far
  // more than it used to: a circle wide enough to hold a ring is now wider than
  // the whole figure, so with twenty-eight of them every fragment inside the
  // frame would walk every ring. The capsule is about three times tighter, and
  // tighter still as the camera rises and the rings flatten toward the segment.
  // The trailing term is the particles' own reach, which is small until an
  // event swells them, so at rest the capsule closes in a little further.
  float capsR = rad * (1.13 * cosT + 0.26) + 0.018 + hit * 0.045;
  float capsR2 = capsR * capsR;

  gQ = q;
  gCosT = cosT;
  gSinT = sinT;
  gInvZ = 1.0 / (2.0 * rad);
  gCz = rad * cosT;
  gZc = rad * sinT;
  // The two streams are accumulated apart so they can be coloured against each
  // other and so their overlap is knowable.
  gUp = 0.0;
  gDn = 0.0;

  for (int i = 0; i < RINGS; i++) {
    // The ring at toroidal angle u, projected: centred on A, reaching from the
    // origin out to 2A.
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

      // The stroke: dense, bright, falling off steeply behind the head.
      for (int k = 0; k < HEAD; k++) {
        float b = 1.0 - float(k) / float(HEAD);
        splat(ca, sa, 0.22 + 0.78 * b * b * b, spread * (0.55 + 0.45 * b));
        float nca = ca * cdh - sa * sdh;
        sa = sa * cdh + ca * sdh;
        ca = nca;
      }

      // The remainder of the circle: sparse and dim, but tight rather than
      // smeared — faint pinpricks read as a line still there, where soft wide
      // blobs would only fog the middle of the form.
      for (int k = 0; k < GHOST; k++) {
        float b = 1.0 - float(k) / float(GHOST);
        splat(ca, sa, 0.035 + 0.075 * b, spread * 0.85);
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
  // Once the camera is up, the stream that goes over the top spends most of its
  // circuit on the visible surface and the one that goes under spends most of
  // its own out of sight. That is correct as geometry and wrong as the subject:
  // the two are supposed to be equals. Lifting the lower stream by the amount
  // the viewpoint costs it — nil head-on, most at the top of the swing — puts
  // them back in balance without touching the shading that makes the form read.
  float accDn = gDn * gain * (1.0 + 0.30 * sinT);

  // The particles are plain white unless a note is sounding: the figure is a
  // drawing, and a drawing at this size wants line and nothing else. Colour is
  // the keyboard's alone — a mouse click or a drift of the cursor still swells
  // the particles and quickens the flow, but the two streams stay white while
  // it does. So the pair is told apart only by the instrument, and off the same
  // eased envelope as the camera: the colour comes up with the swing overhead
  // and goes out with it as the note dies.
  //
  // Where the streams coincide, at the centre and again at the outer equator,
  // only the overlap term is lit, so the moment of union stays white whatever
  // the rest is doing.
  float chroma = clamp(note * 1.35, 0.0, 1.0);
  vec3 cool = mix(vec3(1.0), vec3(0.24, 0.62, 1.00), chroma);
  vec3 warm = mix(vec3(1.0), vec3(1.00, 0.50, 0.18), chroma);

  vec3 col = cool * accUp + warm * accDn;
  col += vec3(1.0) * min(accUp, accDn) * 0.75;

  // Ground: near black, tilted cool above the equator and warm below, at a few
  // percent — the same polarity as the streams, held just above the noise.
  vec3 bg = vec3(0.017, 0.018, 0.023)
          + mix(vec3(0.026, 0.011, 0.005), vec3(0.005, 0.011, 0.026),
                smoothstep(0.10, 0.90, uv.y));
  // The centre keeps a faint glow, and flares on input — the one place on the
  // figure that is always both streams at once.
  bg += mix(vec3(0.66), vec3(0.62, 0.56, 0.74), chroma)
      * exp(-length(q) * 6.0) * (0.014 + hit * 0.09);

  col += bg;

  // Filmic-ish rolloff so overlapping cores saturate to white instead of
  // clipping a channel at a time and going neon.
  col = vec3(1.0) - exp(-col * 1.35);

  // Vignette — off the raw frame, not the fitted space, so it stays a property
  // of the viewport rather than shrinking onto the figure on a narrow screen.
  // Started early and rolled off slowly: eight hundred glowing particles lay
  // down enough haze between them that a tighter falloff draws its own edge
  // across the frame, and a soft disc of light with a rim on it is a far more
  // conspicuous artefact than no vignette at all.
  vec2 vg = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  col *= 1.0 - smoothstep(0.15, 1.35, length(vg)) * 0.32;

  // Grain — the ground is dark and nearly flat, which is exactly where banding
  // shows.
  col += hash(gl_FragCoord.xy + uTime) * 0.020 - 0.010;

  gl_FragColor = vec4(col, 1.0);
}
`;
