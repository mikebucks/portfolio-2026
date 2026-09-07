// A theme = fragment shader + full synth voice + fixed uMacros vec4 (see presets.ts).
// Uniforms are declared with notes in backgroundMaterial.ts.
// gl_FragCoord is physical px; vUv is 0..1, uPointer/uClickPos are -1..1 NDC.

export {
  THEME_PRESETS,
  THEME_IDS,
  DEFAULT_THEME,
  resolveSettings,
  type ThemeId,
  type ThemePreset,
} from "./presets";

export const sharedVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
