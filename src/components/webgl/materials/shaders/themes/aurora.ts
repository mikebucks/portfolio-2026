/**
 * Aurora theme — colorful warped fbm gradient with palette cycling.
 * Reactive to pointer / click / note-on; this was the original background.
 */
export const auroraFragment = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2  uResolution;
uniform vec2  uPointer;         // -1..1
uniform float uPointerImpulse;  // 0..1 decays on move
uniform vec2  uClickPos;        // -1..1
uniform float uClickImpulse;    // 0..1 decays on click
uniform float uNoteOn;          // 0..1 decays on note
uniform float uFrequency;       // Hz
uniform float uVelocity;        // 0..1
uniform float uEnvelope;        // 0..1
uniform float uScroll;          // 0..1
uniform float uReactivity;      // 0..1

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

vec3 palette(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.02, 0.02, 0.04);
  vec3 c1 = vec3(0.10, 0.18, 0.95);
  vec3 c2 = vec3(0.98, 0.90, 0.35);
  vec3 c3 = vec3(1.00, 0.48, 0.22);
  vec3 c4 = vec3(1.00, 0.38, 0.58);
  vec3 c5 = vec3(0.35, 0.90, 0.98);
  vec3 c6 = vec3(1.00, 1.00, 1.00);

  float s = t * 6.0;
  float i = floor(s);
  float f = smoothstep(0.0, 1.0, fract(s));
  vec3 a = c0, b = c1;
  if (i < 0.5)       { a = c0; b = c1; }
  else if (i < 1.5)  { a = c1; b = c2; }
  else if (i < 2.5)  { a = c2; b = c3; }
  else if (i < 3.5)  { a = c3; b = c4; }
  else if (i < 4.5)  { a = c4; b = c5; }
  else               { a = c5; b = c6; }
  return mix(a, b, f);
}

void main() {
  vec2 uv = vUv;

  float pulse =
      0.20 * uPointerImpulse +
      0.55 * uClickImpulse +
      1.00 * uNoteOn * max(uVelocity, 0.4);
  pulse *= (0.5 + 0.5 * uReactivity);

  float t = uTime * (0.045 + 0.12 * pulse);

  vec2 q = vec2(
    fbm(uv * vec2(1.1, 2.2) + vec2(t * 1.7, -t * 0.9)),
    fbm(uv * vec2(1.4, 2.6) + vec2(-t * 1.1, t * 1.5) + 9.3)
  );
  vec2 r = vec2(
    fbm(uv * 2.0 + q + vec2(t, 0.0)),
    fbm(uv * 2.0 + q + vec2(0.0, -t * 0.8) + 3.7)
  );

  vec2 pointerOffset = uPointer * (0.03 + 0.06 * uPointerImpulse);

  vec2 clickUv = uClickPos * 0.5 + 0.5;
  float clickDist = distance(uv, clickUv);
  float clickRipple =
      sin(clickDist * 22.0 - uTime * 5.0) *
      exp(-clickDist * 4.0) *
      uClickImpulse;

  float centerDist = distance(uv, vec2(0.5));
  float noteRipple =
      sin(centerDist * 14.0 - uTime * 3.5) *
      exp(-centerDist * 2.2) *
      uNoteOn * uVelocity;

  float warpAmt = 0.30 + 0.25 * pulse;
  vec2 warped = uv + (r - 0.5) * warpAmt + pointerOffset;
  warped.x += clickRipple * 0.09 + noteRipple * 0.14;
  warped.y += noteRipple * 0.06;

  float band = warped.x
    + 0.08 * sin(warped.y * 6.2831 + uTime * 0.35)
    + 0.05 * sin(uTime * 0.18);

  float hueShift = 0.0;
  if (uNoteOn > 0.001) {
    float f = clamp((uFrequency - 120.0) / 1200.0, 0.0, 1.0);
    hueShift = (f - 0.5) * 0.08 * uNoteOn;
  }

  vec3 col = palette(fract(band + hueShift));

  float bright = mix(0.55, 1.15, smoothstep(-0.1, 1.1, uv.x));
  col *= bright;

  col += pulse * 0.10 * vec3(1.0);

  float v = smoothstep(0.0, 0.85, distance(uv, vec2(0.25, 0.3)));
  col *= mix(0.78, 1.0, v);

  float g = hash(uv * uResolution + uTime) * 0.025;
  col += g - 0.0125;

  gl_FragColor = vec4(col, 1.0);
}
`;
