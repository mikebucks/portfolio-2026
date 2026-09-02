import { NOTE_HUE_GLSL } from "./palette";

/**
 * Cellular noise theme — based on Jesse Harlan's "cell noise with fast math".
 * Free license to use and modify.
 *
 * Macros:
 *   x  Glow    — global brightness lift + softens contrast
 *   y  Bloom   — sharpens cell ridges (more crystalline)
 *   z  Drift   — boosts ambient time scale (cells flow faster)
 *   w  Echo    — adds outward ripple amplitude on cursor / clicks
 */
export const mindFragment = /* glsl */ `
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
uniform vec4 uNoteFreqNorms;
uniform vec4 uNoteAmts;
// Synth fader offsets from the preset, -1..1, 0 = untouched. Here: x volume
// packs the cells denser, y cutoff sharpens the ridges, z reverb lets the
// cursor and click ripples wash further, w delay adds rings to the ripple.
uniform vec4 uSynth;

float ha(float n) { return fract(sin(n) * 713.5354); }

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 mod7(vec3 x) {
  return x - floor(x * (1.0 / 7.0)) * 7.0;
}

vec3 permute(vec3 x) {
  return mod289((27.0 * x + 1.0) * x);
}

vec2 cellular(vec3 P) {
  #define K 0.142857142857
  #define Ko 0.428571428571
  #define K2 0.02065306
  #define Kz 0.166666666667
  #define Kzo 0.416666666667
  #define jitter 1.0

  vec3 Pi = mod289(floor(P));
  vec3 Pf = fract(P) - 0.5;

  vec3 Pfx = Pf.x + vec3(1.0, 0.0, -1.0);
  vec3 Pfy = Pf.y + vec3(1.0, 0.0, -1.0);
  vec3 Pfz = Pf.z + vec3(1.0, 0.0, -1.0);

  vec3 p = permute(Pi.x + vec3(-1.0, 0.0, 1.0));
  vec3 p1 = permute(p + Pi.y - 1.0);
  vec3 p2 = permute(p + Pi.y);
  vec3 p3 = permute(p + Pi.y + 1.0);

  vec3 p11 = permute(p1 + Pi.z - 1.0);
  vec3 p12 = permute(p1 + Pi.z);
  vec3 p13 = permute(p1 + Pi.z + 1.0);

  vec3 p21 = permute(p2 + Pi.z - 1.0);
  vec3 p22 = permute(p2 + Pi.z);
  vec3 p23 = permute(p2 + Pi.z + 1.0);

  vec3 p31 = permute(p3 + Pi.z - 1.0);
  vec3 p32 = permute(p3 + Pi.z);
  vec3 p33 = permute(p3 + Pi.z + 1.0);

  vec3 ox11 = fract(p11 * K) - Ko;
  vec3 oy11 = mod7(floor(p11 * K)) * K - Ko;
  vec3 oz11 = floor(p11 * K2) * Kz - Kzo;

  vec3 ox12 = fract(p12 * K) - Ko;
  vec3 oy12 = mod7(floor(p12 * K)) * K - Ko;
  vec3 oz12 = floor(p12 * K2) * Kz - Kzo;

  vec3 ox13 = fract(p13 * K) - Ko;
  vec3 oy13 = mod7(floor(p13 * K)) * K - Ko;
  vec3 oz13 = floor(p13 * K2) * Kz - Kzo;

  vec3 ox21 = fract(p21 * K) - Ko;
  vec3 oy21 = mod7(floor(p21 * K)) * K - Ko;
  vec3 oz21 = floor(p21 * K2) * Kz - Kzo;

  vec3 ox22 = fract(p22 * K) - Ko;
  vec3 oy22 = mod7(floor(p22 * K)) * K - Ko;
  vec3 oz22 = floor(p22 * K2) * Kz - Kzo;

  vec3 ox23 = fract(p23 * K) - Ko;
  vec3 oy23 = mod7(floor(p23 * K)) * K - Ko;
  vec3 oz23 = floor(p23 * K2) * Kz - Kzo;

  vec3 ox31 = fract(p31 * K) - Ko;
  vec3 oy31 = mod7(floor(p31 * K)) * K - Ko;
  vec3 oz31 = floor(p31 * K2) * Kz - Kzo;

  vec3 ox32 = fract(p32 * K) - Ko;
  vec3 oy32 = mod7(floor(p32 * K)) * K - Ko;
  vec3 oz32 = floor(p32 * K2) * Kz - Kzo;

  vec3 ox33 = fract(p33 * K) - Ko;
  vec3 oy33 = mod7(floor(p33 * K)) * K - Ko;
  vec3 oz33 = floor(p33 * K2) * Kz - Kzo;

  vec3 dx11 = Pfx + jitter * ox11;
  vec3 dy11 = Pfy.x + jitter * oy11;
  vec3 dz11 = Pfz.x + jitter * oz11;

  vec3 dx12 = Pfx + jitter * ox12;
  vec3 dy12 = Pfy.x + jitter * oy12;
  vec3 dz12 = Pfz.y + jitter * oz12;

  vec3 dx13 = Pfx + jitter * ox13;
  vec3 dy13 = Pfy.x + jitter * oy13;
  vec3 dz13 = Pfz.z + jitter * oz13;

  vec3 dx21 = Pfx + jitter * ox21;
  vec3 dy21 = Pfy.y + jitter * oy21;
  vec3 dz21 = Pfz.x + jitter * oz21;

  vec3 dx22 = Pfx + jitter * ox22;
  vec3 dy22 = Pfy.y + jitter * oy22;
  vec3 dz22 = Pfz.y + jitter * oz22;

  vec3 dx23 = Pfx + jitter * ox23;
  vec3 dy23 = Pfy.y + jitter * oy23;
  vec3 dz23 = Pfz.z + jitter * oz23;

  vec3 dx31 = Pfx + jitter * ox31;
  vec3 dy31 = Pfy.z + jitter * oy31;
  vec3 dz31 = Pfz.x + jitter * oz31;

  vec3 dx32 = Pfx + jitter * ox32;
  vec3 dy32 = Pfy.z + jitter * oy32;
  vec3 dz32 = Pfz.y + jitter * oz32;

  vec3 dx33 = Pfx + jitter * ox33;
  vec3 dy33 = Pfy.z + jitter * oy33;
  vec3 dz33 = Pfz.z + jitter * oz33;

  vec3 d11 = dx11 * dx11 + dy11 * dy11 + dz11 * dz11;
  vec3 d12 = dx12 * dx12 + dy12 * dy12 + dz12 * dz12;
  vec3 d13 = dx13 * dx13 + dy13 * dy13 + dz13 * dz13;
  vec3 d21 = dx21 * dx21 + dy21 * dy21 + dz21 * dz21;
  vec3 d22 = dx22 * dx22 + dy22 * dy22 + dz22 * dz22;
  vec3 d23 = dx23 * dx23 + dy23 * dy23 + dz23 * dz23;
  vec3 d31 = dx31 * dx31 + dy31 * dy31 + dz31 * dz31;
  vec3 d32 = dx32 * dx32 + dy32 * dy32 + dz32 * dz32;
  vec3 d33 = dx33 * dx33 + dy33 * dy33 + dz33 * dz33;

  vec3 d1a = min(d11, d12);
  d12 = max(d11, d12);
  d11 = min(d1a, d13);
  d13 = max(d1a, d13);
  d12 = min(d12, d13);
  vec3 d2a = min(d21, d22);
  d22 = max(d21, d22);
  d21 = min(d2a, d23);
  d23 = max(d2a, d23);
  d22 = min(d22, d23);
  vec3 d3a = min(d31, d32);
  d32 = max(d31, d32);
  d31 = min(d3a, d33);
  d33 = max(d3a, d33);
  d32 = min(d32, d33);
  vec3 da = min(d11, d21);
  d21 = max(d11, d21);
  d11 = min(da, d31);
  d31 = max(da, d31);
  d11.xy = (d11.x < d11.y) ? d11.xy : d11.yx;
  d11.xz = (d11.x < d11.z) ? d11.xz : d11.zx;
  d12 = min(d12, d21);
  d12 = min(d12, d22);
  d12 = min(d12, d31);
  d12 = min(d12, d32);
  d11.yz = min(d11.yz, d12.xy);
  d11.y = min(d11.y, d12.z);
  d11.y = min(d11.y, d11.z);
  return sqrt(d11.xy);
}

${NOTE_HUE_GLSL}

float whacky(vec3 p, float bloom) {
  float v = 0.1;
  float w = 0.0;
  float a = 1.0;
  // Bloom widens the contrast curve so cells look sharper / more crystalline.
  // The cutoff fader rides the same exponent: open is crystalline, closed is soft.
  float edge = mix(2.6, 4.6, bloom) * (1.0 + uSynth.y * 0.30);
  for (int i = 0; i < 4; i++) {
    float x = pow(cellular(p).x, 3.14);
    v += a * x;
    w += a;
    p.xy *= 3.0;
    p.z *= 1.2;
    a *= 0.8;
  }
  return smoothstep(0.1, 1.0, pow(v / w * 3.9, edge));
}

void main() {
  float mGlow  = uMacros.x;
  float mBloom = uMacros.y;
  float mDrift = uMacros.z;
  float mEcho  = uMacros.w;

  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  uv.x *= uResolution.x / uResolution.y;

  vec2 pointerUv = uPointer * 0.5 + 0.5;
  pointerUv.x *= uResolution.x / uResolution.y;

  float dist = distance(uv, pointerUv);
  // Reverb fader: a slower falloff lets the disturbance wash further out.
  float falloff = exp(-dist * (3.5 - uSynth.z * 1.4));
  // Echo macro lifts the wave amplitude so cursor leaves a stronger trail.
  float waveAmp = 0.25 + mEcho * 0.55;
  // Delay fader: more rings per unit distance — repeats, spatially.
  float cursorWave = sin(dist * 16.0 * (1.0 + uSynth.w * 0.6) - uTime * 2.4)
                   * falloff * waveAmp / 0.25;

  // ── Spatial click ripple ────────────────────────────────────────────────
  // A shockwave that emanates FROM the click point instead of lifting the whole
  // field. Its radius expands as the impulse decays (1 -> 0), so each click
  // reads as a ring traveling outward from exactly where it landed, with a
  // brighter pop at the origin. Everything is gated by uClickImpulse, so at
  // rest it contributes nothing (and can't show a phantom hot spot at center).
  vec2 clickUv = uClickPos * 0.5 + 0.5;
  clickUv.x *= uResolution.x / uResolution.y;
  float cDist = distance(uv, clickUv);
  float clickRadius = (1.0 - uClickImpulse) * (1.3 + uSynth.z * 0.6); // grows as it fades; reverb reaches further
  float ringD = (cDist - clickRadius) * 6.0;
  float ring = exp(-ringD * ringD);                     // gaussian shell
  float clickPop = exp(-cDist * 5.0);                   // hot core at origin
  float clickAmp = uClickImpulse * (0.4 + mEcho * 0.7);
  float clickWave = (ring + clickPop * 0.6) * clickAmp;

  // Click no longer dominates the GLOBAL pulse (that's what made it read as a
  // full-screen flash) — it keeps only a whisper of it; the visible click
  // response now lives in the local clickWave below. Notes still pulse globally.
  float pulse = 0.12 * uClickImpulse + 1.0 * uNoteOn * max(uVelocity, 0.4);
  pulse *= (0.5 + 0.5 * uReactivity);
  pulse = clamp(pulse, 0.0, 1.0);

  // Drift macro accelerates ambient motion (multiplied on top of the
  // input-driven shaderTime). Stays monotonic. The click ripple also warps the
  // cell field locally so the shockwave disturbs the noise, not just brightness.
  float z = uShaderTime * (1.0 + mDrift * 1.6) + cursorWave * 0.25 + clickWave * 0.3;

  // Volume fader packs the cells denser — more thoughts at louder volume.
  float v = whacky(vec3(uv * (1.0 + uSynth.x * 0.45), z), mBloom);
  v = clamp(v * mix(1.0, 1.55, pulse), 0.0, 1.0);

  // Localized brightness lift from the click, concentrated on the ring/core.
  v = clamp(v + clickWave * 0.22, 0.0, 1.0);

  // Glow lifts overall luminance and softens the floor.
  float glowLift = mGlow * 0.18;
  v = clamp(v + glowLift, 0.0, 1.0);

  float aspect = uResolution.x / uResolution.y;
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

  vec3 col;
  if (weightAccum > 0.001) {
    vec3 blendedHue = colorAccum / weightAccum;
    float totalAmt = clamp(weightAccum, 0.0, 1.0);
    col = mix(vec3(v), blendedHue, totalAmt * v);
  } else {
    col = vec3(v);
  }
  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`;
