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
 *   x  Mass     — ambient ball radius
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

const int BALLS = 220;

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

  // Growth applies to the body of the swarm only; the giants below hold their
  // ambient size. Scaling them too is what floods the field — a giant at 4x
  // spans over half the screen on its own and its tail reaches far past that,
  // so every gap closes and the screen goes flat.
  //
  // The body's ambient size is set at half of where it would otherwise sit, so
  // quadrupling lands it at the size a doubling used to reach. That is the only
  // way to widen the range: how big the swarm can get at full tilt is fixed by
  // geometry — 150 balls can only grow so far before they are simply touching —
  // so a bigger reaction has to come out of the ambient end, not the peak.
  //
  // Tail deliberately does not scale this: it would reintroduce the clipping
  // above. It shapes the wavefront instead.
  float bodyGrow = 1.0 + eased * 3.0;

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

  float sum = 0.0;
  for (int i = 0; i < BALLS; i++) {
    // sx == sin(t + i*stepX), cy == cos(t + i*stepY), u == fract(0.137 + i*phi)
    vec2 c = center + vec2(sx, cy) * amp;
    vec2 toPtr = ptr - c;
    c += toPtr * (pull / (1.0 + dot(toPtr, toPtr) * 14.0));

    // Each ball's radius, as a multiple of the base. The body of the swarm
    // spreads evenly over 0.3-1.8x; only the top 4% of the draw picks up the
    // giant tail on top, ramping quadratically to 18x — about five of them on
    // screen, the share held steady as the ball count changes. Giants have to stay this rare: an inverse-square tail scales with
    // radius squared, so one big ball lifts the field a long way past its own
    // rim. Doubling their number costs most of the swell headroom above; a swarm
    // full of them floods every gap and fuses into a single solid mass. Weight
    // is radius squared, since that is what the band below thresholds against.
    float giant = clamp((u - 0.96) / 0.04, 0.0, 1.0);
    float rf = (0.30 + 1.50 * u) * bodyGrow + 15.0 * giant * giant;
    vec2 d = p - c;
    sum += (rf * rf) / max(dot(d, d), 1e-6);

    float nsx = sx * caX + cx * saX;
    cx = cx * caX - sx * saX;
    sx = nsx;
    float nsy = sy * caY + cy * saY;
    cy = cy * caY - sy * saY;
    sy = nsy;
    u = fract(u + 0.61803399);
  }

  // The band is set from the radius alone: a lone ball's field crosses lo
  // exactly one radius from its centre, so size is independent of ball count
  // and viewport shape. The shoulder up to 3x lo keeps the glowing core and halo.
  float lo = 1.0 / (radius * radius);
  float val = sum;

  // One wavefront for both, thrown from the hit point — which for a note is its
  // pitch position, since notes share this channel. Scaled against the band so
  // it reads the same at any size setting.
  vec2 clickP = vec2((uClickPos.x * 0.5 + 0.5) * aspect, uClickPos.y * 0.5 + 0.5);
  float cd = distance(p, clickP);
  // Driven by the same equalized pulse as the swell, so a click and a key press
  // throw the same wavefront and fade on the same envelope.
  val += sin(cd * 26.0 - uTime * 6.0) * exp(-cd * 3.2)
       * pulse * 0.12 * lo * tailScale;

  float mask = smoothstep(lo, lo * 3.0, val);

  // The divide: bottom-left corner to top-right corner in raw uv, so it hits
  // the actual corners whatever the aspect ratio. Only the line itself is
  // antialiased — a blob crossing it flips tone with no transition.
  float sd = uv.y - uv.x;
  float aa = 2.0 / uResolution.y;
  float above = smoothstep(-aa, aa, sd);

  // Exactly two tones, swapped across the divide: a blob on the light side is
  // the same value as the dark side's background, and vice versa. Contrast
  // pushes the pair apart. One pigment, read two ways.
  float light = mix(0.88, 0.97, mContrast);
  float dark  = mix(0.16, 0.05, mContrast);

  float lightSide = mix(light, dark, mask);
  float darkSide  = mix(dark, light, mask);

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
