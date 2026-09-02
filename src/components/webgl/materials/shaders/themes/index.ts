/**
 * ──────────────────────────────────────────────────────────────────────────────
 * THEME ARCHITECTURE — read before adding a new theme
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Each theme is a `ThemePreset` (in ./presets.ts) that bundles three things:
 *   1. A GLSL fragment shader.
 *   2. A full `SynthSettings` (`baseSettings`) — the entire voice, edited
 *      directly; there is no macro layer. Themes are 1:1 with sounds, so
 *      switching the theme also switches the sound.
 *   3. A fixed `shaderMacros` vec4 fed to the shader as `uMacros` — per-theme
 *      visual constants (formerly the macro-slider defaults).
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
 *   uWave        sampler2D  one cycle of the synth's live output, 256x1, red
 *                        channel, 0..1 with 0.5 as silence. Repeat-wrapped, so
 *                        x counts periods. Retained through silence (see
 *                        lib/audioScope.ts) — safe to drive from any impulse.
 *   uMacros      vec4    per-theme visual constants, 0..1 each (preset's
 *                        `shaderMacros`) — shape the look per theme
 *   uNoteFreqNorms vec4  per-voice color (optional, currently used by cellular)
 *   uNoteAmts      vec4
 *   uSynth       vec4    the synth panel's faders as offsets from the active
 *                        preset — x volume, y cutoff, z reverb, w delay — each
 *                        -1..1 with 0 = untouched. Eased in the render loop.
 *                        Every theme maps them its own way (see each header);
 *                        at 0 every theme is exactly its preset look.
 *   uPendCount   float   Rhythm only: eased pendulum count (volume fader)
 *   uWaveClock   vec2    Rhythm only: x the travelling wave's own monotonic
 *                        phase clock, y its current rate factor (delay fader)
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
  shaderMacrosFor,
  type ThemeId,
  type ThemePreset,
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
