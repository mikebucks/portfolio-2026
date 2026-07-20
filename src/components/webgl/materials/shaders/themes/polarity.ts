/**
 * Ember — warm radial glow with drifting embers and stochastic sparks.
 *
 * Macros:
 *   x  Heat    — widens the hot core, brightens
 *   y  Spark   — increases spark density and flicker rate
 *   z  Crackle — adds high-frequency ember turbulence
 *   w  Smoke   — desaturates and darkens the periphery
 */
export const polarityFragment = /* glsl */ `
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
uniform float uReactivity;
uniform vec4  uMacros;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.02 + 17.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  float mHeat    = uMacros.x;
  float mSpark   = uMacros.y;
  float mCrackle = uMacros.z;
  float mSmoke   = uMacros.w;

  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 c = uv - vec2(0.5);
  c.x *= aspect;

  float t = uShaderTime * (0.6 + mSpark * 0.9);
  float r = length(c);

  // Hot radial core — Heat softens the falloff.
  float hot = exp(-r * mix(2.8, 1.3, mHeat));

  // Flicker — fast luminance modulation.
  float flicker = noise(vec2(uTime * (2.5 + mSpark * 5.0), 1.7)) * 0.5 + 0.5;
  hot *= 0.55 + 0.45 * flicker;

  // Drifting embers — fbm column rising from below.
  vec2 fp = vec2(c.x * 2.0, c.y * 2.0 - t * 0.35);
  float n = fbm(fp);
  float embers = smoothstep(0.45, 0.92, n) * (1.0 - r * 0.65);

  // Crackle — high-frequency turbulence layered on top.
  if (mCrackle > 0.001) {
    float n2 = fbm(fp * 5.0 + vec2(0.0, -t * 1.2));
    embers += smoothstep(0.6, 1.0, n2) * mCrackle * (1.0 - r * 0.8) * 0.7;
  }

  // Sparks — sparse pinpoint highlights that flicker on/off. Mask each lit
  // cell with a sub-cell radial falloff so we get tight dots, not full-cell
  // rectangles.
  float cellDensity = 60.0 + mSpark * 80.0;
  vec2 cellPos = uv * cellDensity;
  vec2 sp = floor(cellPos);
  vec2 sf = fract(cellPos) - 0.5;
  float sparkH = hash(sp + floor(uTime * (6.0 + mSpark * 14.0)));
  float lit = step(0.985 - mSpark * 0.020, sparkH);
  float pt = exp(-dot(sf, sf) * 90.0);
  float spk = lit * pt * (1.0 - r * 0.55);

  // Note flare — radial pulse on note-on.
  float noteFlare = uNoteOn * uVelocity * exp(-r * 1.8);

  // Click pop — bright hotspot at click position.
  vec2 clickC = uClickPos * 0.5;
  clickC.x *= aspect;
  float cd = length(c - clickC);
  float clickPop = uClickImpulse * exp(-cd * 4.0);

  // Cursor warmth — soft glow following the cursor.
  vec2 ptr = uPointer * 0.5;
  ptr.x *= aspect;
  float pd = length(c - ptr);
  float cursorWarm = exp(-pd * pd * 5.0) * (0.10 + 0.45 * uPointerImpulse);

  float reactiveBoost = (0.5 + 0.5 * uReactivity);
  float lum = hot * 0.9
            + embers * 0.55
            + noteFlare * 0.85 * reactiveBoost
            + clickPop * 0.7
            + cursorWarm * 0.3;
  lum = clamp(lum, 0.0, 1.6);

  // Heat-style palette: cool ash → deep red → orange → yellow.
  vec3 ash     = vec3(0.04, 0.015, 0.005);
  vec3 deepRed = vec3(0.42, 0.06, 0.025);
  vec3 orange  = vec3(1.00, 0.46, 0.10);
  vec3 yellow  = vec3(1.00, 0.95, 0.62);

  vec3 col = mix(ash, deepRed, smoothstep(0.0, 0.32, lum));
  col = mix(col, orange, smoothstep(0.3, 0.85, lum));
  col = mix(col, yellow, smoothstep(0.85, 1.45, lum));

  // Sparks — pure incandescent dot.
  col += spk * vec3(1.0, 0.92, 0.65);

  // Smoke — desaturate periphery toward a cool grey.
  if (mSmoke > 0.001) {
    float smokeMask = smoothstep(0.25, 1.0, r);
    vec3 grey = vec3(dot(col, vec3(0.33))) * vec3(0.7, 0.65, 0.6);
    col = mix(col, grey, smokeMask * mSmoke * 0.7);
  }

  // Subtle grain to break banding.
  float g = hash(gl_FragCoord.xy + uTime * 0.5) * 0.025;
  col += g - 0.0125;

  gl_FragColor = vec4(col, 1.0);
}
`;
