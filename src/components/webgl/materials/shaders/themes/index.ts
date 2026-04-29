/**
 * ──────────────────────────────────────────────────────────────────────────────
 * THEME ARCHITECTURE — read before adding a new theme
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Each theme is a `ThemePreset` (in ./presets.ts) that bundles three things:
 *   1. A GLSL fragment shader.
 *   2. A baseline `SynthSettings`.
 *   3. Four `Macro`s — 0..1 sliders that morph the synth and feed into the
 *      shader as `uMacros vec4`. Themes are 1:1 with synth presets, so
 *      switching the theme also switches the sound.
 *
 * Shared shader uniforms:
 *
 *   uTime        float   raw elapsed seconds
 *   uShaderTime  float   integrated phase, monotonic, advances faster on input
 *   uResolution  vec2    canvas size in PHYSICAL pixels
 *   uPointer     vec2    cursor in -1..1 NDC, off-screen until first move
 *   uPointerImpulse float
 *   uClickPos    vec2    last click in -1..1 NDC
 *   uClickImpulse float
 *   uNoteOn      float
 *   uFrequency   float
 *   uVelocity    float
 *   uEnvelope    float
 *   uScroll      float
 *   uReactivity  float   0..1 user-controlled sensitivity
 *   uMacros      vec4    per-theme macro values, 0..1 each — drive both the
 *                        synth and the shader so the two stay in sync
 *   uNoteFreqNorms vec4  per-voice color (optional, currently used by cellular)
 *   uNoteAmts      vec4
 *
 * Coordinate note: gl_FragCoord is physical pixels, vUv and uPointer are
 * logical 0..1 / -1..1. Multiply uv.x by uResolution.x/uResolution.y for an
 * aspect-corrected space.
 * ──────────────────────────────────────────────────────────────────────────────
 */

export {
  THEME_PRESETS,
  THEME_IDS,
  DEFAULT_THEME,
  resolveSettings,
  defaultMacrosFor,
  type ThemeId,
  type ThemePreset,
  type Macro,
} from "./presets";

import { THEME_PRESETS, type ThemeId, type ThemePreset } from "./presets";

/**
 * Single fullscreen-plane vertex shader shared by every theme.
 */
export const sharedVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Backwards-compatible label/fragment view used by the renderer.
 */
export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  fragment: string;
};

export const THEMES: Record<ThemeId, ThemeDefinition> = Object.fromEntries(
  (Object.values(THEME_PRESETS) as ThemePreset[]).map((p) => [
    p.id,
    { id: p.id, label: p.label, fragment: p.fragment },
  ]),
) as Record<ThemeId, ThemeDefinition>;
