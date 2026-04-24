precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uScroll;
uniform vec2  uPointer;     // -1..1
uniform float uNoteOn;      // impulse, decays to 0
uniform float uFrequency;   // Hz of last note
uniform float uVelocity;    // 0..1
uniform float uEnvelope;    // 0..1
uniform float uFilterCutoff;// 0..1
uniform float uReactivity;  // 0..1
uniform vec2  uResolution;

// Cheap hash / noise (iq)
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
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);

  // Slow flow
  float t = uTime * 0.06;
  vec2 q = p * 1.3 + vec2(t, -t * 0.5);
  q += (uPointer * 0.35) * (0.3 + 0.7 * uReactivity);

  float f = fbm(q + fbm(q + fbm(q)));

  // Note-driven ripple from center, scaled by velocity & reactivity.
  float dist = length(p);
  float ripple = sin(dist * 14.0 - uTime * 2.0 - uNoteOn * 4.0);
  ripple *= exp(-dist * 2.0) * uNoteOn * uVelocity * uReactivity;

  // Hue shifted by frequency — map roughly 80Hz..2kHz to a hue band.
  float hue = clamp((uFrequency - 80.0) / 2000.0, 0.0, 1.0);
  vec3 colA = vec3(0.04, 0.05, 0.07);
  vec3 colB = mix(
    vec3(0.14, 0.18, 0.28),
    vec3(0.45, 0.95, 0.23), // accent
    hue * 0.6 + 0.2 * uEnvelope
  );

  float shape = smoothstep(0.15, 0.95, f + ripple);
  vec3 col = mix(colA, colB, shape * (0.35 + 0.65 * uFilterCutoff));

  // Subtle vignette
  float vign = smoothstep(1.1, 0.35, dist);
  col *= vign;

  // Grain
  float g = hash(uv * uResolution + uTime) * 0.025;
  col += g - 0.012;

  gl_FragColor = vec4(col, 1.0);
}
