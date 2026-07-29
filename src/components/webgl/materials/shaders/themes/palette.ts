/**
 * The note palette — the five stops a key press ramps through as pitch rises,
 * violet → blue → teal → amber → rose. Muted on purpose: these are read against
 * a dark ground as a tint over luminance, not as flat fills.
 *
 * Shared as a GLSL chunk rather than duplicated per theme, so themes that are
 * meant to look related cannot drift apart. Interpolate it into a fragment
 * source and call `noteHue(freqNorm)` with a 0..1 normalized frequency —
 * `uNoteFreqNorms` carries one per sounding voice.
 *
 * Kept in its own module: `themes/index.ts` would be the natural home, but it
 * imports the presets, which import the fragments, which would import it back.
 */
export const NOTE_HUE_GLSL = /* glsl */ `
vec3 noteHue(float freqNorm) {
  vec3 c0 = vec3(0.38, 0.32, 0.72);
  vec3 c1 = vec3(0.28, 0.50, 0.82);
  vec3 c2 = vec3(0.22, 0.66, 0.62);
  vec3 c3 = vec3(0.72, 0.56, 0.28);
  vec3 c4 = vec3(0.70, 0.38, 0.52);
  float t = clamp(freqNorm, 0.0, 1.0) * 4.0;
  float i = floor(t);
  float f = smoothstep(0.0, 1.0, fract(t));
  if (i < 0.5)      return mix(c0, c1, f);
  else if (i < 1.5) return mix(c1, c2, f);
  else if (i < 2.5) return mix(c2, c3, f);
  else              return mix(c3, c4, f);
}
`;
