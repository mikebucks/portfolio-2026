/**
 * Pulse — dark grid of dots that pulse with the beat. Cyberpunk pulse.
 *
 * Macros:
 *   x  Width  — increases grid density (more, smaller dots)
 *   y  Drive  — sharpens dots and lifts contrast
 *   z  Wobble — adds sinusoidal warp to the grid
 *   w  Boom   — shifts hue toward magenta and amplifies low-end saturation
 */
export const pulseFragment = /* glsl */ `
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

void main() {
  float mWidth  = uMacros.x;
  float mDrive  = uMacros.y;
  float mWobble = uMacros.z;
  float mBoom   = uMacros.w;

  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 c = uv - vec2(0.5);
  c.x *= aspect;

  float t = uShaderTime;

  // Wobble — sinusoidal domain warp.
  vec2 w = c;
  w.x += sin(c.y * 8.0 + t * 1.2 + uPointer.x * 1.5) * 0.045 * mWobble;
  w.y += sin(c.x * 8.0 - t * 0.9 + uPointer.y * 1.5) * 0.045 * mWobble;

  // Grid of dots — Width macro increases density.
  float density = mix(8.0, 30.0, mWidth);
  vec2 g = w * density;
  vec2 gf = fract(g) - 0.5;
  // Drive sharpens dot edges by tightening the gaussian.
  float dotMask = exp(-dot(gf, gf) * mix(28.0, 70.0, mDrive));

  // Beat oscillation — slow heartbeat synced to time.
  float pulse = 0.5 + 0.5 * sin(t * 1.6);
  float beat = uNoteOn * uVelocity + uClickImpulse * 0.6;

  // Cursor highlight — warm glow follows the pointer.
  vec2 ptr = uPointer * 0.5;
  ptr.x *= aspect;
  float pr = length(c - ptr);
  float cursorGlow = exp(-pr * pr * 7.0) * (0.25 + 0.7 * uPointerImpulse);

  // Click ripple — outward wave through the grid.
  vec2 clickC = uClickPos * 0.5;
  clickC.x *= aspect;
  float cd = length(c - clickC);
  float clickWave = sin(cd * 18.0 - uTime * 6.0) * exp(-cd * 3.0) * uClickImpulse;

  // Color: indigo / violet base, shifted toward magenta by Boom.
  vec3 base = vec3(0.04, 0.04, 0.07);
  vec3 hi   = mix(vec3(0.40, 0.55, 1.00), vec3(1.00, 0.30, 0.70), mBoom);

  float reactiveBoost = (0.5 + 0.5 * uReactivity);
  float intensity = dotMask * (0.5 + 0.5 * pulse + beat * 0.85 * reactiveBoost)
                  + cursorGlow * 0.55
                  + clickWave * 0.35;
  intensity *= (0.65 + mDrive * 1.05);

  vec3 col = base + hi * intensity;

  // Boom adds a low rumble of color across the whole frame on beat.
  col += hi * mBoom * beat * 0.18;

  // Vignette — soft circular fade.
  float r = length(c);
  col *= 1.0 - smoothstep(0.45, 1.05, r) * (0.55 - mBoom * 0.2);

  // Grain — keeps the dark areas alive.
  float gn = hash(gl_FragCoord.xy + uTime * 0.5);
  col += (gn - 0.5) * 0.028;

  gl_FragColor = vec4(col, 1.0);
}
`;
