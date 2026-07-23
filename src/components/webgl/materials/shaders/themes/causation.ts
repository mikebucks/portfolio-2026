/**
 * Causation theme — a slowly scrolling, terraced landscape ray-marched from a
 * layered cosine-noise field. Adapted from a classic Mr. Doob terrain sketch,
 * but stripped to the black-and-white palette established by the Mind theme so
 * the two read as the same universe. Cause & Effect: the camera flies forward
 * forever (cause), and every ridge is a stepped plateau — a discrete effect of
 * the continuous field beneath it.
 *
 * Reactivity:
 *   • pointer      pans the view + leaves a screen-space ripple (uPointer)
 *   • click        a wavefront that rebuilds the terrain outward from the point
 *                  on the ground that was clicked (uClick*) — geometry, not an
 *                  overlay: the ground rises through terrace levels and grows
 *                  new plateaus as the front passes
 *   • home-row     each note raises the same wavefront, quieter and placed by
 *                  pitch, and drives the forward scroll pulse + hue accents
 *
 * Macros:
 *   x  Glow    — global brightness lift + softer floor
 *   y  Bloom   — sharpens ridge / terrace contrast
 *   z  Drift   — boosts forward scroll + field flow speed
 *   w  Echo    — outward ripple amplitude on cursor / clicks
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

const mat2 m2 = mat2(0.8, -0.6, 0.6, 0.8);

// Wave basis. The original was 0.7 * (sin(x) + sin(y)) — separable and
// axis-aligned, so every octave stamped down the same square lattice and the
// range read as a predictable grid of peaks marching to the horizon. A third
// wave at an incommensurate direction *and* frequency makes the sum
// non-separable and quasi-periodic: it never exactly repeats, at any scale.
float cosNoise(in vec2 p) {
  return 0.56 * (
      sin(p.x)
    + sin(p.y)
    + 0.9 * sin(0.7317 * p.x + 1.2471 * p.y + 1.71)
  );
}

// Octave budget for a sample this far from the camera. Detail fine enough to
// matter in the foreground is pure aliasing noise at the horizon, so the field
// carries eight octaves up close and sheds them with distance — the standard
// heightfield LOD trick. Weights are fractional (see \`octaves\`), so an octave
// fades in rather than popping.
float lodAt(in float d) {
  return clamp(11.6 - log2(max(d, 1.0)), 5.5, 8.0);
}

// The octave detail of the heightfield, without the \`relief\` and global-drift
// base terms. Shading contrast is measured against this rather than absolute
// world height.
//
// Those base terms lift and drop whole regions by several units, so keying off
// raw pos.y meant flying into a basin crushed the entire frame dark while
// cresting a massif washed it out — the look drifted with camera position.
// The octave sum has the same statistical range everywhere on the map by
// construction, so a ridge reads as a ridge wherever the camera happens to be.
// (Deliberately NOT pos.y minus a baseline: the terrace mapping is nonlinear,
// so no single scale factor tracks it across regions.)
//
// Lacunarity is 2.13, deliberately not 2.0: with a sine basis an exact doubling
// makes every octave a harmonic of the fundamental, so the whole sum is
// periodic on the first octave's lattice — that periodicity *was* the repeating
// pattern. An irrational-ish ratio, plus a phase offset per octave so they
// don't all align at the origin, breaks it permanently.
//
// Gain 0.575 against that lacunarity puts the slope ratio above 1, so each
// octave adds proportionally *more* gradient than the last: the range gets
// rougher the closer you look rather than resolving into smooth blobs. Eight
// octaves reach ~120x the base frequency, about six times finer than the old
// stack — that top end is what the foreground was missing.
// \`redraw\` (0..1) is the click wavefront's grip on this spot — see clickWave.
// Where it's high the stack samples a displaced domain and leans on its fine
// octaves, so the ground the wave crosses re-forms into new, busier terrain
// instead of just swelling: the click draws land rather than tinting pixels.
float octaves(in vec2 p, in float lod, in float redraw) {
  // Domain offset, not a scale — the field is read from somewhere else
  // entirely, so what surfaces behind the front is different terrain, not the
  // same terrain amplified.
  vec2 q = p * 0.6 + redraw * 1.6;
  float d = 0.0;
  float s = 1.5;
  for (int i = 0; i < 8; i++) {
    float w = clamp(lod - float(i), 0.0, 1.0);
    if (w <= 0.0) break;
    // Only the fine octaves get the boost. Weighting the broad ones would move
    // whole massifs and read as the camera lurching, not as detail arriving.
    float gain = 1.0 + redraw * 0.6 * step(2.5, float(i));
    d += s * w * gain * cosNoise(q);
    s *= 0.575;
    q = m2 * q * 2.13 + vec2(1.7, -2.3);
  }
  return d * 0.3;
}

// Sub-march relief used for shading only — finer than the ray marcher can
// resolve, so it perturbs the normal instead of the geometry (see main).
float microField(in vec2 p) {
  vec2 q = p * 2.6;
  float h = 0.0;
  float s = 1.0;
  for (int i = 0; i < 3; i++) {
    h += s * cosNoise(q);
    s *= 0.55;
    q = m2 * q * 2.3 + 5.1;
  }
  return h;
}

// Layered heightfield.
float terrain(in vec2 p, in float t, in float lod, in float redraw) {
  // Large-scale rolling elevation — same wave basis, but very low frequency,
  // and NOT a domain warp: it only lifts/drops the base height, it never
  // distorts the sample coords. So the range gains taller massifs and lower
  // basins (less uniform) without the field smearing into a texture. Three
  // terms at unrelated frequencies rather than two: the longest one is wider
  // than the whole visible draw distance, so the far ridges sit at genuinely
  // different elevations instead of all hugging one horizon line.
  float relief = cosNoise(p * 0.06)
               + 0.5 * cosNoise(m2 * p * 0.113 + 3.0)
               + 0.75 * cosNoise(p * 0.021 + 11.0);

  float base = sin(t * 0.2) * 4.0 + relief * 1.8;
  // The wave buys extra octaves as well as extra weight on them, so the swept
  // ground genuinely resolves finer rather than only louder.
  return base * 0.3 + octaves(p, lod + redraw * 1.1, redraw);
}

// The click wavefront, in world xz. \`clickC\` is where the click actually
// landed on the terrain (see main). Returns:
//   .x  height added to the field, *before* terracing
//   .y  "redraw" weight 0..1 — how hard this spot is being rebuilt
//
// The radius expands as uClickImpulse decays, so the ground heaves outward from
// the point that was clicked: a narrow crest raising the land at the front, and
// a wider band trailing it where the terrain rebuilds and then settles.
//
// uClickStrength scales the whole response without touching uClickImpulse,
// which is what drives the radius — a weaker wave has to be *quieter*, not
// pre-expanded, and scaling the impulse would have started it mid-flight. It
// lets a keypress raise a gentler swell than a deliberate click.
vec2 clickWave(in vec2 xz, in vec2 clickC) {
  if (uClickImpulse < 0.001 || uClickStrength < 0.001) return vec2(0.0);
  float d = distance(xz, clickC);
  float radius = (1.0 - uClickImpulse) * 36.0;
  float x = d - radius;
  float amp = uClickImpulse * uClickStrength;

  float crest  = exp(-x * x * 0.03);                          // raised leading ridge
  float trough = 0.35 * exp(-(x + 7.0) * (x + 7.0) * 0.022);  // dip trailing behind it
  float lift = (crest - trough) * amp * (0.75 + uMacros.w * 0.85);

  // The redraw weight is a band trailing the front, not a filled disc. Filling
  // the disc meant every point the wave had ever touched stayed rebuilt at full
  // strength, so within about a second the "local" effect covered the frame and
  // went back to reading as something done to the whole canvas. Rising as the
  // front arrives and decaying over ~20 units behind it keeps a travelling wave
  // with ground visibly settling in its wake.
  //
  // It rides that band and never the crest: the crest is a few units wide, and
  // sliding the sample domain across something that narrow puts a near
  // discontinuity in the field the sphere-trace cannot step over — it surfaces
  // as long smeared streaks radiating from the click. This ramps over ~12 units.
  float behind = radius - d;
  float redraw = smoothstep(-5.0, 7.0, behind) * exp(-max(behind, 0.0) * 0.05)
               * amp;

  return vec2(lift, redraw);
}

// Quantizes the field into plateaus — the "effects" of the theme.
//
// The unit step is load-bearing and shouldn't be shrunk for extra contour
// bands: this swings between the raw height and ~2x it, so each riser is as
// tall as the terrain under it rather than as tall as the step. Halving the
// step doesn't add plateaus, it just runs the same full-height swing twice as
// often and the whole range dissolves into foam. Extra detail belongs in the
// octave stack, which is where it now is.
float terraced(in float h) {
  float mf2 = (cos(2.0 * h * 3.14159265) + 1.0) * 0.5;
  return mix(ceil(h) * 2.0, h, mf2);
}

// Signed distance to the surface, ignoring the click. The click ray marches
// against this to find where it landed, which would otherwise be circular —
// the wave's origin can't depend on the wave.
float mapBase(in vec3 pos, in float t, in float lod) {
  return pos.y - terraced(terrain(pos.xz, t, lod, 0.0));
}

// Signed distance to the surface the camera sees.
//
// The lift goes into the field *before* terracing, not onto the surface after
// it. Added afterwards it was a smooth bump sliding over a terraced landscape —
// geometry, but geometry that read as an overlay, which is exactly the
// complaint. Going in beforehand, the rising ground climbs through terrace
// levels and grows new plateaus and risers on the way up: the land restates
// itself in its own vocabulary.
float map(in vec3 pos, in float t, in vec2 clickC, in float lod) {
  vec2 cw = clickWave(pos.xz, clickC);
  return pos.y - terraced(terrain(pos.xz, t, lod, cw.y) + cw.x);
}

// Normal epsilon widens with distance so the added high-frequency octaves
// average out on far slopes instead of shimmering pixel to pixel.
vec3 calcNormal(in vec3 pos, in float t, in vec2 clickC, in float lod, in float dist) {
  vec2 e = vec2(0.014 + dist * 0.0035, 0.0);
  return normalize(vec3(
    map(pos + e.xyy, t, clickC, lod) - map(pos - e.xyy, t, clickC, lod),
    map(pos + e.yxy, t, clickC, lod) - map(pos - e.yxy, t, clickC, lod),
    map(pos + e.yyx, t, clickC, lod) - map(pos - e.yyx, t, clickC, lod)
  ));
}

// Shadows run two octaves coarser than the surface they land on — the fine
// detail is invisible in an occlusion term and this is 12 more field evaluations
// per pixel.
float calcShadow(in vec3 ro, in vec3 rd, in float t, in vec2 clickC, in float lod) {
  float res = 1.0;
  float d = 0.4;
  for (int i = 0; i < 12; i++) {
    vec3 pos = ro + d * rd;
    float h = map(pos, t, clickC, lod - 2.0);
    res = min(res, max(h, 0.0) * 1.2 / d);
    if (res < 0.02) break;
    d += clamp(h * 0.3, 0.15, 1.2);
  }
  return clamp(res, 0.0, 1.0);
}

// Same 5-stop accent palette as Mind so the audio color reads identically. The
// base field stays grayscale; these only tint where notes land.
vec3 noteHue(float freqNorm) {
  vec3 c0 = vec3(0.38, 0.32, 0.72);
  vec3 c1 = vec3(0.28, 0.50, 0.82);
  vec3 c2 = vec3(0.22, 0.66, 0.62);
  vec3 c3 = vec3(0.72, 0.56, 0.28);
  vec3 c4 = vec3(0.70, 0.38, 0.52);
  float tt = clamp(freqNorm, 0.0, 1.0) * 4.0;
  float i = floor(tt);
  float f = smoothstep(0.0, 1.0, fract(tt));
  if (i < 0.5)      return mix(c0, c1, f);
  else if (i < 1.5) return mix(c1, c2, f);
  else if (i < 2.5) return mix(c2, c3, f);
  else              return mix(c3, c4, f);
}

void main() {
  float mGlow  = uMacros.x;
  float mBloom = uMacros.y;
  float mDrift = uMacros.z;
  float mEcho  = uMacros.w;

  // Aspect-corrected screen space for the pointer ripple (matches Mind).
  float aspect = uResolution.x / uResolution.y;
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  uv.x *= aspect;

  vec2 pointerUv = uPointer * 0.5 + 0.5;
  pointerUv.x *= aspect;
  float pDist = distance(uv, pointerUv);
  float pFall = exp(-pDist * 3.5);
  float waveAmp = 0.25 + mEcho * 0.55;
  float cursorWave = sin(pDist * 16.0 - uTime * 2.4) * pFall * waveAmp / 0.25;

  // Global pulse: notes only. The click used to lift the whole frame's
  // brightness a little, which is a canvas-wide response to a local event — the
  // one thing guaranteed to make the interaction feel like it lives on the
  // surface of the screen. Its entire response is now terrain.
  float pulse = uNoteOn * max(uVelocity, 0.4);
  pulse *= (0.5 + 0.5 * uReactivity);
  pulse = clamp(pulse, 0.0, 1.0);

  // Monotonic forward scroll. Drift accelerates it; the cursor ripple warps the
  // field phase locally so the mouse disturbs the land as it passes.
  float scroll = uShaderTime * (0.55 + mDrift * 1.1);
  float mt = scroll + cursorWave * 0.5;

  // Camera flying forward over the terrain, panned by the cursor. uPointer sits
  // off-screen (-9,-9) until first move, so pActive keeps the view centered
  // until the user actually moves — no jump on load.
  float pActive = step(abs(uPointer.x), 1.5) * step(abs(uPointer.y), 1.5);
  vec2 pan = uPointer * pActive;

  vec3 ro = vec3(100.0, 19.0, -scroll);
  vec2 q = (-1.0 + 2.0 * (gl_FragCoord.xy / uResolution.xy));
  q.x *= aspect;
  q += pan * vec2(0.4, 0.28);
  vec3 rd = normalize(vec3(q.x, q.y - 1.5, -1.0));

  // Where the click landed, in world xz — the point the wave radiates from.
  //
  // This used to intersect the click ray with the y=0 ground plane, but the
  // range stands several units above that, so the ray sailed over the ridge the
  // user aimed at and the origin landed well beyond it. The wave then started
  // somewhere unrelated to what was clicked, which is most of why it read as
  // something happening to the canvas rather than to the land. Marching the
  // real surface puts the origin under the cursor.
  //
  // Coarse and short: this only has to seed a 46-unit wavefront, and it runs
  // for the ~1.7s a click stays alive.
  //
  // The pan uses uClickPos, not uPointer: the pointer sits exactly where the
  // click landed at the moment it fires, so they agree then — but uClickPos
  // holds still afterwards, and keying off the live pointer would drag the
  // origin across the ground every time the mouse moved after clicking.
  vec2 clickOrigin = vec2(1e5);
  if (uClickImpulse > 0.001) {
    vec2 cq = uClickPos;
    cq.x *= aspect;
    cq += uClickPos * vec2(0.4, 0.28);
    vec3 crd = normalize(vec3(cq.x, cq.y - 1.5, -1.0));
    float ct = 0.0;
    for (int i = 0; i < 22; i++) {
      float ch = mapBase(ro + crd * ct, mt, 5.5);
      if (ch < 0.25 || ct > 70.0) break;
      ct += ch * 0.45;
    }
    clickOrigin = (ro + crd * ct).xz;
  }

  // Sphere-trace the heightfield. Draw distance is deeper than before so the
  // vista stacks more ridges before the fog takes over; the distance-driven LOD
  // pays for it by making those far steps cheaper than the old fixed six
  // octaves. The hit threshold relaxes with distance for the same reason —
  // sub-pixel precision at 60 units is wasted marching.
  float tmax = 65.0;
  float t = 0.0;
  for (int i = 0; i < 56; i++) {
    vec3 pos = ro + rd * t;
    float h = map(pos, mt, clickOrigin, lodAt(t));
    if (h < 0.045 * (1.0 + t * 0.09) || t > tmax) break;
    t += h * 0.33;
  }

  // Sky / background: a soft vertical grade from black up to a dim graphite,
  // nudged brighter by the note pulse. Keeps the frame from ever going flat.
  float sky = 0.02 + 0.10 * smoothstep(-0.4, 1.4, rd.y + 0.9);
  vec3 col = vec3(sky);

  if (t < tmax) {
    vec3 pos = ro + t * rd;
    float lod = lodAt(t);
    vec3 nor = calcNormal(pos, mt, clickOrigin, lod, t);

    // Micro-relief: finer than the march can resolve, so it tilts the shading
    // normal instead of displacing the surface — foreground plateaus get a
    // worked, rocky grain for the cost of three field taps rather than sixty.
    // Faded out with distance so it never turns into fizz on the far ridges.
    float micro = exp(-t * 0.03);
    if (micro > 0.02) {
      vec2 e2 = vec2(0.045, 0.0);
      float m0 = microField(pos.xz);
      float mx = microField(pos.xz + e2.xy) - m0;
      float mz = microField(pos.xz + e2.yx) - m0;
      nor = normalize(nor - vec3(mx, 0.0, mz) * (micro * 0.034 / e2.x));
    }

    vec3 light = normalize(vec3(0.25, 0.65, -0.5));
    float sha = calcShadow(pos + nor * 0.12, light, mt, clickOrigin, lod);

    float dif = clamp(dot(nor, light), 0.0, 1.0);
    float amb = 0.10 + 0.30 * clamp(nor.y, 0.0, 1.0);
    float lum = amb * 0.30 + dif * sha * 1.05;

    // Push mids toward black so the field reads as a dark base with bright
    // ridges (the Mind key), then Bloom claws contrast back for crisp plateaus.
    // Gamma is gentler than before — the old 1.9 floor was crushing the lit
    // faces along with the shadows, which is what kept the crests gray.
    lum = pow(clamp(lum, 0.0, 1.0), mix(1.7, 1.05, mBloom));

    // Low terrain sinks into black; only the raised plateaus stay luminous —
    // gives the range depth instead of a flat snowfield. Measured against the
    // local baseline so the same ridge reads the same whether it sits on a
    // massif or in a basin.
    // Same redraw weight the geometry used, so the swept ground is shaded as
    // the terrain it now is rather than the terrain it was.
    float redraw = clickWave(pos.xz, clickOrigin).y;
    float valley = smoothstep(-0.45, 0.85, octaves(pos.xz, lod + redraw * 1.1, redraw));
    lum *= mix(0.16, 1.0, valley);
    lum = clamp(lum, 0.0, 1.0);

    // S-curve pivoted on mid-gray: darks fall away, lit faces climb toward
    // white, and the midpoint holds. This is the main contrast lever — a
    // narrow toe-to-shoulder window is what separates ridge from valley
    // instead of the whole range sitting in the mids.
    lum = smoothstep(0.18, 0.86, lum);

    // Lift only the already-bright crests toward white — increases contrast
    // against the dark base without touching the shadows, so the range stops
    // reading as uniformly gray. Gentler than it was: with the finer octaves
    // now in the field, the old lift clipped whole lit faces to flat white and
    // took every bit of that new structure with it.
    lum += smoothstep(0.72, 1.0, lum) * 0.20;
    lum = clamp(lum, 0.0, 1.0);

    // Distance fog folds far terrain back into the sky. Slackened to match the
    // deeper draw distance — the far ridges stay faintly readable instead of
    // dissolving where the old tmax used to cut them off.
    float fog = exp(-0.00026 * t * t);
    col = mix(vec3(sky), vec3(lum), fog);
  }

  // Note / click pulse brightens the whole frame slightly.
  col = clamp(col * mix(1.0, 1.35, pulse), 0.0, 1.0);

  // Glow lifts luminance and softens the floor.
  col = clamp(col + mGlow * 0.14, 0.0, 1.0);

  // ── Audio-reactive hue accents (identical to Mind) ──────────────────────────
  // The field is monochrome; active note voices tint it by angle around the
  // frame center, blended in proportion to the grayscale luminance so the black
  // stays black and only lit structure takes color.
  float v = dot(col, vec3(0.333));
  vec2 sceneCenter = vec2(aspect * 0.5, 0.5);
  float angle = atan(uv.y - sceneCenter.y, uv.x - sceneCenter.x);
  float rotation = uTime * 0.12;

  vec3 colorAccum = vec3(0.0);
  float weightAccum = 0.0;
  for (int i = 0; i < 4; i++) {
    float amt = uNoteAmts[i];
    if (amt < 0.004) continue;
    float phase = angle + float(i) * 1.5708 + rotation;
    float angWeight = 0.5 + 0.5 * cos(phase);
    float w = amt * angWeight;
    colorAccum += noteHue(uNoteFreqNorms[i]) * w;
    weightAccum += w;
  }

  if (weightAccum > 0.001) {
    vec3 blendedHue = colorAccum / weightAccum;
    float totalAmt = clamp(weightAccum, 0.0, 1.0);
    col = mix(col, blendedHue, totalAmt * v);
  }
  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`;
