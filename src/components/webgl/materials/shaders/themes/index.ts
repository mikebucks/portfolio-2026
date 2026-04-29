import { auroraFragment } from "./aurora";
import { cellularFragment } from "./cellular";

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * THEME ARCHITECTURE — read before adding a new theme
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Every theme is a GLSL fragment shader string. The shared uniforms are:
 *
 *   uTime        float   raw elapsed seconds (use for bounded oscillations,
 *                        click/note ripples, grain — NOT as the noise drive)
 *   uShaderTime  float   integrated phase, advances at 5 % of full speed at
 *                        rest and ramps to 100 % on click/note input. Always
 *                        monotonic. Drive all noise / field inputs from this
 *                        so the shader never reverses when input decays.
 *   uResolution  vec2    canvas size in PHYSICAL pixels (gl_FragCoord units)
 *   uPointer     vec2    cursor in -1..1 NDC, initialized off-screen (-9,-9)
 *                        until the user moves. Use spatially — not as an
 *                        impulse — to avoid stutter (see cellular.ts).
 *   uPointerImpulse float  0..1 velocity-scaled impulse, decays on move
 *   uClickPos    vec2    last click position in -1..1 NDC
 *   uClickImpulse float  0..1, bumped on click, decays
 *   uNoteOn      float   0..1, bumped on note_on, decays
 *   uFrequency   float   Hz of last note
 *   uVelocity    float   0..1 velocity of last note
 *   uEnvelope    float   0..1 rough envelope follower
 *   uScroll      float   0..1 page-scroll progress
 *   uReactivity  float   0..1 user-controlled sensitivity knob
 *
 * Coordinate note: gl_FragCoord is in physical pixels. Pointer is in logical
 * NDC (-1..1). To match them in the same UV space:
 *   vec2 uv      = gl_FragCoord.xy / uResolution.xy;       // 0..1 logical UV
 *   vec2 ptrUV   = uPointer * 0.5 + 0.5;                   // 0..1
 * These are directly comparable. Apply aspect correction to both axes equally
 * if you want aspect-correct distance calculations.
 * ──────────────────────────────────────────────────────────────────────────────
 */

/**
 * Single fullscreen-plane vertex shader shared by every theme.
 * Themes only swap the fragment shader; uniforms are shared.
 */
export const sharedVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export type ThemeId = "cellular" | "aurora";

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  fragment: string;
};

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  cellular: {
    id: "cellular",
    label: "Cellular",
    fragment: cellularFragment,
  },
  aurora: {
    id: "aurora",
    label: "Aurora",
    fragment: auroraFragment,
  },
};

export const THEME_IDS: readonly ThemeId[] = ["cellular", "aurora"] as const;

export const DEFAULT_THEME: ThemeId = "cellular";
