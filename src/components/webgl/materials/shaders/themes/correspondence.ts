/**
 * Correspondence — grayscale metaballs over a light/dark divide; tones swap
 * across the line. Cursor only steers the balls; clicks/notes swell them and
 * rotate the divide. The drift clock never reacts to input.
 * Macros: x ball radius, y orbit speed, z tone contrast, w wavefront lift.
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
uniform float uDivideAngle;   // divide normal angle, stepped 45° per note
// Faders: x ball count, y glint tightness, z merge softness, w ring reach.
uniform vec4  uSynth;

// Loop runs to BALLS_MAX and breaks at the live count (no recompile).
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

  // y-normalised: y 0..1, x 0..aspect.
  vec2 p = vec2(uv.x * aspect, uv.y);

  // 1.25: a bare click lands at the magnitude of a keypress (which fires both).
  float clickTerm = uClickImpulse * uClickStrength * 1.25;
  float noteTerm  = uNoteOn * max(uVelocity, 0.4);
  float pulse = (clickTerm + noteTerm) * (0.5 + 0.5 * uReactivity);

  // Raw uTime only: uShaderTime's decaying tail reads as lag after a hit.
  float t = uTime * (0.011 + 0.015 * mDrift);

  float tailScale = 1.0 + mTail * 1.4;

  // Do not scale pulse before the clamp: a clipped peak freezes the swarm
  // at full size until the impulse decays back below 1.
  float drive = clamp(pulse, 0.0, 1.0);
  float eased = drive * drive;

  // Growth weighted to the big balls; uniform growth floods the field.
  float growSmall = 1.0 + eased * 0.28;
  float growBig   = 1.0 + eased * 1.7;

  float radius = mix(0.0058, 0.0092, mMass);

  // Amplitude past the edges so the sine turning points (bunching) are off-screen.
  vec2 center = vec2(aspect * 0.5, 0.5);
  vec2 amp = vec2(aspect * 0.64, 0.64);

  // Wobble on stepY keeps the pattern from repeating exactly.
  float stepX = 1.0;
  float stepY = 55.0 + sin(uTime * 0.05) * 0.01;

  // Phase advanced by rotating unit vectors: no sin/cos per ball.
  float caX = cos(stepX), saX = sin(stepX);
  float caY = cos(stepY), saY = sin(stepY);
  float sx = sin(t), cx = cos(t);
  float sy = sin(t), cy = cos(t);

  // Golden-ratio sequence: evenly spread sizes, fixed per ball.
  float u = 0.137;

  vec2 ptr = vec2((uPointer.x * 0.5 + 0.5) * aspect, uPointer.y * 0.5 + 0.5);
  float pull = 0.22 + 0.18 * uPointerImpulse;

  float rScale = mix(1.5, 1.95, mMass);

  // smin merge softness; reverb fader widens it.
  float k = (0.045 + 0.03 * mMass) * (1.0 + uSynth.z * 0.6);

  // Smooth-min distance field. R (blended radius) and G (outward dir) ride
  // along so Relief below can rebuild a 3D normal.
  float sdf = 1e5;
  float R   = 0.0;
  vec2  G   = vec2(0.0);
  // 188 at the bottom, 220 preset, 252 top.
  int nBalls = BALLS + int(floor(uSynth.x * 32.0 + 0.5));
  for (int i = 0; i < BALLS_MAX; i++) {
    if (i >= nBalls) break;
    // sx == sin(t + i*stepX), cy == cos(t + i*stepY), u == fract(0.137 + i*phi)
    vec2 c = center + vec2(sx, cy) * amp;
    vec2 toPtr = ptr - c;
    c += toPtr * (pull / (1.0 + dot(toPtr, toPtr) * 14.0));

    // One continuous size curve, leaning small; a giant tier read as bimodal.
    float sz = u * sqrt(u);
    float rf = mix(1.0, 3.4, sz)
             * mix(growSmall, growBig, smoothstep(0.55, 1.0, sz));
    float ri = radius * rScale * rf;

    vec2  pc  = p - c;
    float len = sqrt(dot(pc, pc)) + 1e-6;
    vec2  dir = pc / len;
    float di  = len - ri;

    // Polynomial smin; R and G share h so the neck stays continuous.
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

  // Click/note ring dents the distance field; delay fader slows its falloff.
  vec2 clickP = vec2((uClickPos.x * 0.5 + 0.5) * aspect, uClickPos.y * 0.5 + 0.5);
  float cd = distance(p, clickP);
  sdf -= sin(cd * 26.0 - uTime * 6.0) * exp(-cd * (3.2 - uSynth.w * 1.6))
       * pulse * 0.03 * tailScale;

  // ── Relief ──
  // Sphere-cap height z = √(R²−ρ²), ρ = R − depth inside; normal from G and z.
  float inside = max(-sdf, 0.0);
  float z    = sqrt(max(inside * (2.0 * R - inside), 0.0));   // = √(R²−ρ²)
  float rho  = max(R - inside, 0.0);
  vec3 nrm = normalize(vec3(normalize(G + 1e-6) * rho, z + 1e-4));

  // One pixel AA edge; |∇sdf| ≈ 1.
  float aaw = 1.5 / uResolution.y;
  float mask = 1.0 - smoothstep(-aaw, aaw, sdf);

  // Upper-left key light, half-Lambert + soft Blinn glint.
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 L = normalize(vec3(-0.35, 0.55, 0.75));
  vec3 H = normalize(L + V);
  float diff = dot(nrm, L) * 0.5 + 0.5;              // half-Lambert, 0..1
  float spec = pow(max(dot(nrm, H), 0.0), 42.0 * (1.0 + uSynth.y * 0.6)); // sheen

  // Divide: line through centre, normal at uDivideAngle. 3π/4 == uv.y − uv.x.
  vec2 dc = uv - 0.5;
  vec2 dn = vec2(cos(uDivideAngle), sin(uDivideAngle));
  float sd = dot(dc, dn);
  // AA width scaled by screen-space slope: ~1.5px at any angle/aspect.
  float aa = 1.5 * length(vec2(dn.x / aspect, dn.y)) / uResolution.y;
  float above = smoothstep(-aa, aa, sd);

  // Two tones, swapped across the divide.
  float light = mix(0.88, 0.97, mContrast);
  float dark  = mix(0.16, 0.05, mContrast);

  float mid = (light + dark) * 0.5;   // white bead's shadow floor
  float hi  = spec * 0.85 * (1.0 + uSynth.y * 0.7); // glint

  // White bead on the dark side.
  float darkFig = mix(mid, light, diff) + hi;

  // Dark bead on the light side: shallow dome so it never greys out.
  float lightFig = mix(dark * 0.35, dark + 0.05, diff) + hi;

  float lightSide = mix(light, lightFig, mask);
  float darkSide  = mix(dark,  darkFig,  mask);

  float lum = mix(darkSide, lightSide, above);

  // Each side lifts toward its own extreme so the inversion holds.
  lum += pulse * 0.06 * mix(-1.0, 1.0, above);

  lum = clamp(lum, 0.0, 1.0);

  vec3 col = vec3(lum);

  float g = hash(gl_FragCoord.xy + uTime) * 0.022;
  col += g - 0.011;

  gl_FragColor = vec4(col, 1.0);
}
`;
