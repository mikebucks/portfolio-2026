/**
 * Tide — flowing water field with caustic ridges. Cool, watery, calm.
 *
 * Macros:
 *   x  Depth   — darkens the deep palette and saturates blues
 *   y  Splash  — amplifies cursor / note ripple
 *   z  Current — speeds up the underlying flow
 *   w  Foam    — strengthens caustic highlight density
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
    p = p * 2.02 + vec2(7.1, 3.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  float mDepth   = uMacros.x;
  float mSplash  = uMacros.y;
  float mCurrent = uMacros.z;
  float mFoam    = uMacros.w;

  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 cuv = uv;
  cuv.x *= aspect;
  vec2 ptr = uPointer * 0.5 + 0.5;
  ptr.x *= aspect;

  // uShaderTime is monotonic; multiply by Current macro for adjustable flow.
  float t = uShaderTime * (0.55 + mCurrent * 1.2);

  // Cursor ripple — splash macro scales amplitude.
  float d = distance(cuv, ptr);
  float ripple = sin(d * 14.0 - uTime * 2.4) * exp(-d * 3.0)
                 * (0.35 + mSplash * 0.9);

  // Click ripple — sharper, faster.
  vec2 clickC = uClickPos * 0.5 + 0.5;
  clickC.x *= aspect;
  float cd = distance(cuv, clickC);
  float clickRip = sin(cd * 22.0 - uTime * 5.0) * exp(-cd * 4.0) * uClickImpulse;

  // Note ripple — emanates from screen center.
  vec2 cen = vec2(aspect * 0.5, 0.5);
  float ncd = distance(cuv, cen);
  float noteRip = sin(ncd * 16.0 - uTime * 3.5) * exp(-ncd * 2.4)
                  * uNoteOn * uVelocity;

  // Domain warp via fbm — caustic-like flow.
  vec2 q = vec2(
    fbm(uv * 2.0 + vec2(t * 0.30,  t * 0.20)),
    fbm(uv * 2.0 + vec2(-t * 0.25, t * 0.18) + 5.0)
  );
  vec2 warped = uv + (q - 0.5) * 0.32
              + vec2(ripple, ripple) * 0.04
              + vec2(clickRip, clickRip) * 0.08
              + vec2(noteRip, noteRip) * 0.05;

  float n  = fbm(warped * 3.0 + t * 0.18);
  float n2 = fbm(warped * 8.0 - t * 0.12);
  // Sharp caustic ridges — pow tightens them.
  float caustic = pow(1.0 - abs(n2 - 0.5) * 2.0, 8.0);

  // Palette: deep navy → teal → foam.
  vec3 deep    = mix(vec3(0.03, 0.06, 0.13), vec3(0.0, 0.015, 0.05), mDepth);
  vec3 mid     = mix(vec3(0.05, 0.30, 0.45), vec3(0.02, 0.20, 0.40), mDepth * 0.6);
  vec3 shallow = vec3(0.36, 0.78, 0.80);

  vec3 col = mix(deep, mid, smoothstep(0.18, 0.65, n));
  col = mix(col, shallow, smoothstep(0.55, 0.88, n));

  // Foam — bright caustic streaks.
  col += caustic * (0.18 + mFoam * 0.85) * vec3(0.7, 0.95, 1.0);

  // Reactive pulse — quick brightening on click / note.
  float pulse = (0.55 * uClickImpulse + 1.0 * uNoteOn * max(uVelocity, 0.4))
                * (0.5 + 0.5 * uReactivity);
  col += pulse * 0.12 * vec3(0.7, 0.95, 1.1);

  // Vignette — pulls the eye to the centre.
  float v = 1.0 - smoothstep(0.4, 1.05, distance(uv, vec2(0.5)));
  col *= 0.65 + 0.35 * v;

  // Subtle grain.
  float g = hash(gl_FragCoord.xy + uTime) * 0.022;
  col += g - 0.011;

  gl_FragColor = vec4(col, 1.0);
}
`;
