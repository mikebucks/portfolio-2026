/**
 * Correspondence — grayscale metaballs over a diagonal light/dark divide.
 *
 * "As above, so below." A single line runs corner to corner, bottom-left to
 * top-right. Above it the field is light with dark blobs; below it the field is
 * dark with light blobs — the same value read two ways. The blobs drift across
 * the whole screen and flip tone the instant they cross the line.
 *
 * Structured after the reference metaball sketch: every ball rides one shared
 * circle at one shared angular speed, the phase stepping per index, so the
 * population moves as one. The field is their summed inverse-square falloff
 * read through a wide soft band, which is what gives glowing cores and halos
 * rather than a hard isosurface. The reference's near-1/d falloff is too flat
 * once the balls are spread over a whole screen instead of its middle half —
 * inverse-square keeps nearby balls dominant, so they stay legible.
 *
 * Input is split by kind. The cursor only steers: balls lean toward it and the
 * drift never changes rate, so the ambient motion is constant. Clicks and notes
 * answer almost entirely in size — the clock gains a hair of speed, the balls
 * swell a lot.
 *
 * Macros:
 *   x  Mass     — ambient ball radius, the whole spread scaling with it
 *   y  Drift    — orbit speed
 *   z  Contrast — separation between the two tones
 *   w  Tail     — lifts the wavefront thrown by clicks / notes
 */
export const correspondenceFragment = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2  uResolution;
uniform vec2  uPointer;
uniform float uPointerImpulse;
uniform vec2  uClickPos;
uniform float uClickImpulse;
uniform float uClickStrength;
uniform float uNoteOn;
uniform float uVelocity;
uniform float uReactivity;
uniform vec4  uMacros;
uniform float uDivideAngle;   // normal angle of the divide, stepped 45° per note
// Synth fader offsets from the preset, -1..1, 0 = untouched. Here: x volume
// sets how many balls there are, y cutoff tightens and brightens the glint,
// z reverb lets balls fuse from further apart, w delay lets the wavefront's
// rings travel further before they die.
uniform vec4  uSynth;

// The swarm at rest. The loop below runs to BALLS_MAX and breaks at the live
// count, so the volume fader can add or remove balls without a recompile —
// and because the per-ball recurrences advance at the END of the body, every
// ball below the count is exactly where it always was.
const int BALLS = 220;
const int BALLS_MAX = 252;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  float mMass     = uMacros.x;
  float mDrift    = uMacros.y;
  float mContrast = uMacros.z;
  float mTail     = uMacros.w;

  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;

  // Work in y-normalised space: y spans 0..1, x spans 0..aspect. Blobs stay
  // round and the field covers the full canvas at any viewport shape.
  vec2 p = vec2(uv.x * aspect, uv.y);

  // Clicks and notes pulse; the cursor deliberately does not. It steers the
  // balls (below) and leaves the drift untouched, so the ambient motion runs at
  // one constant rate no matter what the mouse is doing.
  //
  // A key press drives both channels — it bumps the note impulse and also fires
  // a click, placed by pitch, at reduced strength (see InteractiveBackground).
  // A mouse click drives only the click channel. Weighting that channel by
  // uClickStrength, which is 1 for a real click and ~0.45 for a note's, lets a
  // bare click land at the same magnitude as a key press instead of half of it.
  float clickTerm = uClickImpulse * uClickStrength * 1.25;
  float noteTerm  = uNoteOn * max(uVelocity, 0.4);
  float pulse = (clickTerm + noteTerm) * (0.5 + 0.5 * uReactivity);

  // One constant rate, off raw uTime. Input never touches the clock: it answers
  // in size alone (bodyGrow below), which can snap back the instant the impulse
  // is spent. A speed-up cannot — uShaderTime, the only clock that reacts to
  // input, is an integral of a decaying impulse, so the motion keeps running
  // fast for the second-odd it takes that tail to fall away. That trailing drift
  // is what reads as a delay after the event, and no weighting of it fixes that;
  // the reaction has to leave the clock alone.
  float t = uTime * (0.011 + 0.015 * mDrift);

  float tailScale = 1.0 + mTail * 1.4;

  // The impulse driving this snaps to full the instant an input lands, so the
  // attack is already immediate whatever curve sits here — the exponent only
  // shapes the way back down. Above 1 it falls away fast and gets out of the
  // way; a fractional power did the opposite, holding the swarm open through
  // the whole of the impulse's slow tail.
  //
  // Nothing may scale the drive up before the clamp. Anything that pushes the
  // peak well past 1 flattens the top of the curve, and the swarm then sits
  // pinned at full size, visibly frozen, for however long the impulse takes to
  // decay back through the clipped part — a full second of dead time when this
  // was multiplied by tailScale. Peak drive now lands just over 1, so the plateau
  // is a tenth of a second and the swarm starts shrinking as soon as it is hit.
  float drive = clamp(pulse, 0.0, 1.0);
  float eased = drive * drive;

  // Growth is graded by size in the loop below. Scaling every ball alike is what
  // floods the field: 220 balls can only grow so far before they are simply
  // touching, and a flat multiplier puts geometric coverage over 100% — one solid
  // sheet. Weighting it toward the balls that are already large spends the same
  // area budget on far fewer, bigger blobs, so the biggest swell while the gaps
  // stay open. Kept gentle — the swell on a hit is a nudge, not a lunge.
  //
  // Tail deliberately does not scale these: it would reintroduce the clipping
  // above. It shapes the wavefront instead.
  float growSmall = 1.0 + eased * 0.28;
  float growBig   = 1.0 + eased * 1.7;

  // Ambient radius, in y-units. Fixed — growth rides on bodyGrow instead, so the
  // band stays put and each ball's size is its own business.
  float radius = mix(0.0058, 0.0092, mMass);

  // Every ball rides the same circle at the same angular speed; only the phase
  // differs, stepping by one increment per index. The amplitude reaches past
  // the edges so the population covers the whole canvas instead of sitting in a
  // box in the middle — and it puts the sine's turning points, where balls bunch
  // up, safely off-screen.
  vec2 center = vec2(aspect * 0.5, 0.5);
  vec2 amp = vec2(aspect * 0.64, 0.64);

  // Phase steps per index — x by 1 radian, y by ~55, as in the reference. The
  // slow wobble on the y step keeps the pattern from ever exactly repeating.
  float stepX = 1.0;
  float stepY = 55.0 + sin(uTime * 0.05) * 0.01;

  // Rather than evaluating sin/cos per ball, carry the phase forward by
  // rotating a unit vector — angle addition, two multiplies a step. The whole
  // swarm then costs six transcendentals total instead of six per ball.
  float caX = cos(stepX), saX = sin(stepX);
  float caY = cos(stepY), saY = sin(stepY);
  float sx = sin(t), cx = cos(t);
  float sy = sin(t), cy = cos(t);

  // Per-ball size draw. Stepping by the golden ratio and wrapping gives a
  // low-discrepancy sequence: fixed per ball, no drift over time, and evenly
  // spread, so the share of the swarm landing in any size range is exactly the
  // width of that range. That last property is what makes the rare-giant tail
  // below controllable — an arcsine or random draw bunches unpredictably.
  float u = 0.137;

  // Cursor attraction: each ball leans toward the pointer, strongly when close
  // and negligibly far away. This is the pointer's only influence.
  vec2 ptr = vec2((uPointer.x * 0.5 + 0.5) * aspect, uPointer.y * 0.5 + 0.5);
  float pull = 0.22 + 0.18 * uPointerImpulse;

  // Radius scale from y-units to the sphere sizes we actually draw. The ambient
  // radius above is tiny (it once only set a field threshold); as real geometry
  // the balls need to read as bodies, so scale them up here.
  float rScale = mix(1.5, 1.95, mMass);

  // Merge softness for the smooth-minimum union, in y-units. Larger k lets two
  // balls fuse from further apart and fattens the neck between them — this single
  // number is what turns a field of separate spheres into flowing metal. Kept
  // small so balls stay distinct and only fuse when they genuinely touch, rather
  // than pooling the whole swarm into one sheet.
  // The reverb fader widens it: a wetter field pools and smears.
  float k = (0.045 + 0.03 * mMass) * (1.0 + uSynth.z * 0.6);

  // Smooth-minimum DISTANCE field of the swarm. The old field summed an inverse-
  // square falloff per ball, so overlapping balls stacked into independent domes
  // that merely crossed each other. This instead unions true 2D sphere distances
  // with smin: within k of one another two balls become ONE surface with a neck,
  // exactly like the reference's 3D metaballs. Carried alongside the distance are
  // the blended radius R — which sets how tall the surface domes at each point —
  // and the outward surface direction G — the in-plane half of its normal — so a
  // full 3D surface is reconstructed from this one screen-space pass (see Relief).
  float sdf = 1e5;
  float R   = 0.0;
  vec2  G   = vec2(0.0);
  // Volume fader: 188 balls at the bottom, 220 at the preset, 252 at the top.
  int nBalls = BALLS + int(floor(uSynth.x * 32.0 + 0.5));
  for (int i = 0; i < BALLS_MAX; i++) {
    if (i >= nBalls) break;
    // sx == sin(t + i*stepX), cy == cos(t + i*stepY), u == fract(0.137 + i*phi)
    vec2 c = center + vec2(sx, cy) * amp;
    vec2 toPtr = ptr - c;
    c += toPtr * (pull / (1.0 + dot(toPtr, toPtr) * 14.0));

    // Each ball's radius, as a multiple of the base, drawn as one continuous
    // curve rather than in classes. A separate giant tier read as bimodal — a
    // handful of huge blobs among uniformly tiny ones, five of them holding
    // nearly two thirds of the visible area. Spread across a single range the
    // biggest five hold about a twentieth, and every size in between is
    // represented. The mild power keeps a lean toward the small end so the
    // field still has texture rather than reading as one repeated dot.
    float sz = u * sqrt(u);
    float rf = mix(1.0, 3.4, sz)
             * mix(growSmall, growBig, smoothstep(0.55, 1.0, sz));
    float ri = radius * rScale * rf;

    // This ball's 2D signed distance, and the unit direction pointing out of it —
    // which is the in-plane part of the surface normal for the sphere it caps.
    vec2  pc  = p - c;
    float len = sqrt(dot(pc, pc)) + 1e-6;
    vec2  dir = pc / len;
    float di  = len - ri;

    // Polynomial smooth union. h is the blend weight: 1 keeps the running field,
    // 0 takes this ball, and in between the two fuse. Radius and direction ride
    // the SAME h, so height and normal stay continuous straight through the neck.
    float h = clamp(0.5 + 0.5 * (di - sdf) / k, 0.0, 1.0);
    sdf = mix(di, sdf, h) - k * h * (1.0 - h);
    R   = mix(ri,  R, h);
    G   = mix(dir, G, h);

    float nsx = sx * caX + cx * saX;
    cx = cx * caX - sx * saX;
    sx = nsx;
    float nsy = sy * caY + cy * saY;
    cy = cy * caY - sy * saY;
    sy = nsy;
    u = fract(u + 0.61803399);
  }

  // Click / note wavefront — a ring pushed out from the hit point (a note's is
  // its pitch position). It dents the distance surface so a press reads as a
  // pulse rippling across the metal, on the same equalized envelope as the swell.
  vec2 clickP = vec2((uClickPos.x * 0.5 + 0.5) * aspect, uClickPos.y * 0.5 + 0.5);
  float cd = distance(p, clickP);
  // The delay fader slows the falloff so more of the rings survive the trip.
  sdf -= sin(cd * 26.0 - uTime * 6.0) * exp(-cd * (3.2 - uSynth.w * 1.6))
       * pulse * 0.03 * tailScale;

  // ── Relief ────────────────────────────────────────────────────────────────
  // Lift the flat distance field into 3D. Inside the body the surface stands z
  // above the plane exactly as a sphere cap would — z = √(R²−ρ²), with ρ the
  // in-plane distance from the local centre recovered as R minus how far inside
  // we are — so the unioned field reads as real fused spheres: doming at each
  // core, sinking into a neck where two meet. The surface normal is that cap's:
  // the outward direction G scaled by ρ gives the in-plane tilt, z the part that
  // faces the viewer. At a core (ρ→0) it looks straight out; at a rim (z→0) it
  // lies flat — a true spherical normal, which is what the old field never had.
  float inside = max(-sdf, 0.0);
  float z    = sqrt(max(inside * (2.0 * R - inside), 0.0));   // = √(R²−ρ²)
  float rho  = max(R - inside, 0.0);
  vec3 nrm = normalize(vec3(normalize(G + 1e-6) * rho, z + 1e-4));

  // Coverage straight off the distance field: 1 inside the body, 0 outside, a
  // pixel-wide antialiased edge at the surface. No soft halo — these are solid
  // bodies with a defined silhouette, as in the reference. aaw is one render
  // pixel in the shader's y-normalised units (|∇sdf| ≈ 1 for a distance field).
  float aaw = 1.5 / uResolution.y;
  float mask = 1.0 - smoothstep(-aaw, aaw, sdf);

  // One key light from the upper-left, viewer head-on. Half-Lambert (the 0.5/0.5
  // remap) keeps the shaded flank reading as rounded form instead of falling to
  // black; the Blinn term adds the tight liquid-metal highlight the reference
  // gets from its chrome, kept soft so the blobs stay beads, not mirrors.
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 L = normalize(vec3(-0.35, 0.55, 0.75));
  vec3 H = normalize(L + V);
  float diff = dot(nrm, L) * 0.5 + 0.5;              // half-Lambert, 0..1
  // Cutoff fader: an open filter is a tight bright glint, a closed one a broad
  // dull sheen.
  float spec = pow(max(dot(nrm, H), 0.0), 42.0 * (1.0 + uSynth.y * 0.6)); // sheen

  // The divide is a line through the centre whose normal rotates with input:
  // every synth note turns it 45° clockwise, so it sweeps diagonal → horizontal
  // → opposite diagonal → vertical and on around, the light and dark sides
  // trading places each half-turn. uDivideAngle is that normal's angle, eased in
  // the render loop so the line sweeps to its new orientation rather than
  // snapping. At rest (3π/4) the normal is (-1,1) and sd reduces exactly to the
  // old uv.y − uv.x, so the resting frame is unchanged.
  vec2 dc = uv - 0.5;
  vec2 dn = vec2(cos(uDivideAngle), sin(uDivideAngle));
  float sd = dot(dc, dn);
  // Antialias the line alone. Its screen-space slope changes with both the angle
  // and the aspect, so scale the edge width by that slope to hold it a constant
  // ~1.5 px wide at every orientation — a blob crossing still flips with no
  // transition of its own.
  float aa = 1.5 * length(vec2(dn.x / aspect, dn.y)) / uResolution.y;
  float above = smoothstep(-aa, aa, sd);

  // Exactly two tones, swapped across the divide: a blob on the light side is
  // the same value as the dark side's background, and vice versa. Contrast
  // pushes the pair apart. One pigment, read two ways.
  float light = mix(0.88, 0.97, mContrast);
  float dark  = mix(0.16, 0.05, mContrast);

  // The figure — the blob — is a lit bead standing off the ground, while the
  // background behind it stays the clean single tone the divide depends on. The
  // two beads are exact tonal opposites, one pigment read two ways: a near-white
  // sphere on the dark side, a near-black sphere on the light side, both lit from
  // the same upper-left key and both capped with the same white glint. diff (the
  // lit fraction) walks each from its shadow to its lit crown.
  float mid = (light + dark) * 0.5;   // mid grey — the white bead's shadow floor
  float hi  = spec * 0.85 * (1.0 + uSynth.y * 0.7); // white glint, added over the body

  // White bead (dark side): a lit sphere rising to the light tone.
  float darkFig = mix(mid, light, diff) + hi;

  // Dark bead (light side): the opposite — a near-black glossy sphere. Its body
  // stays down near the dark tone, doming only a little from shadow to crown so
  // it never greys out; the white glint and the round silhouette carry the 3D,
  // so it reads as the exact negative of the white beads rather than a grey disc.
  float lightFig = mix(dark * 0.35, dark + 0.05, diff) + hi;

  float lightSide = mix(light, lightFig, mask);
  float darkSide  = mix(dark,  darkFig,  mask);

  float lum = mix(darkSide, lightSide, above);

  // Impulses lift both sides toward their own extreme rather than toward white,
  // so the inversion holds through a hit.
  lum += pulse * 0.06 * mix(-1.0, 1.0, above);

  lum = clamp(lum, 0.0, 1.0);

  vec3 col = vec3(lum);

  float g = hash(gl_FragCoord.xy + uTime) * 0.022;
  col += g - 0.011;

  gl_FragColor = vec4(col, 1.0);
}
`;
