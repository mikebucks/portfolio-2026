/**
 * Causation theme — a slowly scrolling, terraced landscape ray-marched from a
 * layered cosine-noise field. Adapted from a classic Mr. Doob terrain sketch,
 * but stripped to the black-and-white palette established by the Mind theme so
 * the two read as the same universe. Cause & Effect: the camera flies forward
 * forever (cause), and every ridge is a stepped plateau — a discrete effect of
 * the continuous field beneath it.
 *
 * Reactivity mirrors Mind exactly:
 *   • pointer      pans the view + leaves a screen-space ripple (uPointer)
 *   • click        a soft swell that deforms the terrain itself (uClick*)
 *   • home-row audio drives the forward scroll pulse + the note-hue accents
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
uniform float uNoteOn;
uniform float uVelocity;
uniform float uReactivity;
uniform vec4  uMacros;
uniform vec4  uNoteFreqNorms;
uniform vec4  uNoteAmts;

const mat2 m2 = mat2(0.8, -0.6, 0.6, 0.8);

float cosNoise(in vec2 p) {
  return 0.7 * (sin(p.x) + sin(p.y));
}

// Layered cosine-noise heightfield.
float terrain(in vec2 p, in float t) {
  vec2 q = p * 0.6;

  // Large-scale rolling elevation — same cosine basis, but very low frequency,
  // and NOT a domain warp: it only lifts/drops the base height, it never
  // distorts the sample coords. So the range gains taller massifs and lower
  // basins (less uniform) without the field smearing into a texture.
  float relief = cosNoise(p * 0.06) + 0.5 * cosNoise(m2 * p * 0.11 + 3.0);

  float h = sin(t * 0.2) * 4.0 + relief * 1.8;
  float s = 1.5;
  // Six octaves rather than seven: the seventh was pure high-frequency fizz that
  // the terracing turned into a stippled blur on the peaks. Dropping it keeps
  // the crests crisp while leaving the terraced shape untouched.
  for (int i = 0; i < 6; i++) {
    h += s * cosNoise(q);
    s *= 0.55;
    q = m2 * q * 2.0;
  }
  return h * 0.3;
}

// Just the octave detail from terrain() — the same loop, with the \`relief\` and
// global-drift base terms omitted. This is what shading contrast is measured
// against instead of absolute world height.
//
// Those base terms lift and drop whole regions by several units, so keying off
// raw pos.y meant flying into a basin crushed the entire frame dark while
// cresting a massif washed it out — the look drifted with camera position.
// The octave sum has the same statistical range everywhere on the map by
// construction, so a ridge reads as a ridge wherever the camera happens to be.
// (Deliberately NOT pos.y minus a baseline: the terrace mapping is nonlinear,
// so no single scale factor tracks it across regions.)
float terrainDetail(in vec2 p) {
  vec2 q = p * 0.6;
  float d = 0.0;
  float s = 1.5;
  for (int i = 0; i < 6; i++) {
    d += s * cosNoise(q);
    s *= 0.55;
    q = m2 * q * 2.0;
  }
  return d * 0.3;
}

// Click swell, applied as an actual displacement of the terrain height (not a
// screen overlay). \`clickC\` is the world-space xz where the click landed; the
// wavefront is a raised ridge whose radius expands as uClickImpulse decays, so
// the ground itself heaves outward from the click point. Kept low so it nudges
// the land rather than erupting through it.
float clickLift(in vec2 xz, in vec2 clickC) {
  if (uClickImpulse < 0.001) return 0.0;
  float d = distance(xz, clickC);
  float radius = (1.0 - uClickImpulse) * 34.0;      // wavefront grows as it fades
  float x = d - radius;
  float crest = exp(-x * x * 0.05);                 // raised leading ridge
  float trough = 0.3 * exp(-(x + 5.0) * (x + 5.0) * 0.04); // slight dip trailing behind it
  return (crest - trough) * uClickImpulse * (1.1 + uMacros.w * 1.3);
}

// Signed distance to the terraced surface. The mix between \`ceil(h)*2\` and the
// raw height quantizes the field into plateaus — the "effects" of the theme.
float map(in vec3 pos, in float t, in vec2 clickC) {
  float h = terrain(pos.xz, t);
  float mf2 = (cos(2.0 * h * 3.14159265) + 1.0) * 0.5;
  float terr = mix(ceil(h) * 2.0, h, mf2);
  terr += clickLift(pos.xz, clickC);
  return pos.y - terr;
}

vec3 calcNormal(in vec3 pos, in float t, in vec2 clickC) {
  vec2 e = vec2(0.02, 0.0);
  return normalize(vec3(
    map(pos + e.xyy, t, clickC) - map(pos - e.xyy, t, clickC),
    map(pos + e.yxy, t, clickC) - map(pos - e.yxy, t, clickC),
    map(pos + e.yyx, t, clickC) - map(pos - e.yyx, t, clickC)
  ));
}

float calcShadow(in vec3 ro, in vec3 rd, in float t, in vec2 clickC) {
  float res = 1.0;
  float d = 0.4;
  for (int i = 0; i < 12; i++) {
    vec3 pos = ro + d * rd;
    float h = map(pos, t, clickC);
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

  // Global pulse: notes dominate, click keeps only a whisper (as in Mind). The
  // click's visible response lives in the terrain geometry, not here.
  float pulse = 0.12 * uClickImpulse + 1.0 * uNoteOn * max(uVelocity, 0.4);
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

  // Project the click into world space by intersecting its view ray with the
  // ground plane (y=0), giving the xz origin the terrain swell radiates from.
  vec2 cq = uClickPos;
  cq.x *= aspect;
  vec3 crd = normalize(vec3(cq.x, cq.y - 1.5, -1.0));
  vec2 clickOrigin = (ro + (-ro.y / crd.y) * crd).xz;

  // Sphere-trace the heightfield. A few more, slightly smaller steps sharpen the
  // distant ridge silhouettes where the old march undersampled and softened them.
  float tmax = 55.0;
  float t = 0.0;
  for (int i = 0; i < 60; i++) {
    vec3 pos = ro + rd * t;
    float h = map(pos, mt, clickOrigin);
    if (h < 0.06 || t > tmax) break;
    t += h * 0.35;
  }

  // Sky / background: a soft vertical grade from black up to a dim graphite,
  // nudged brighter by the note pulse. Keeps the frame from ever going flat.
  float sky = 0.02 + 0.10 * smoothstep(-0.4, 1.4, rd.y + 0.9);
  vec3 col = vec3(sky);

  if (t < tmax) {
    vec3 pos = ro + t * rd;
    vec3 nor = calcNormal(pos, mt, clickOrigin);
    vec3 light = normalize(vec3(0.25, 0.65, -0.5));
    float sha = calcShadow(pos + nor * 0.12, light, mt, clickOrigin);

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
    float valley = smoothstep(-0.45, 0.85, terrainDetail(pos.xz));
    lum *= mix(0.16, 1.0, valley);
    lum = clamp(lum, 0.0, 1.0);

    // S-curve pivoted on mid-gray: darks fall away, lit faces climb toward
    // white, and the midpoint holds. This is the main contrast lever — a
    // narrow toe-to-shoulder window is what separates ridge from valley
    // instead of the whole range sitting in the mids.
    lum = smoothstep(0.20, 0.80, lum);

    // Lift only the already-bright crests toward white — increases contrast
    // against the dark base without touching the shadows, so the range stops
    // reading as uniformly gray.
    lum += smoothstep(0.60, 0.96, lum) * 0.35;
    lum = clamp(lum, 0.0, 1.0);

    // Distance fog folds far terrain back into the sky.
    float fog = exp(-0.00035 * t * t);
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
