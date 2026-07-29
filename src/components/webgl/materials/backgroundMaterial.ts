import * as THREE from "three";
import {
  DEFAULT_THEME,
  sharedVertex,
  THEMES,
  type ThemeId,
} from "./shaders/themes";

export function createBackgroundMaterial(themeId: ThemeId = DEFAULT_THEME) {
  return new THREE.ShaderMaterial({
    vertexShader: sharedVertex,
    fragmentShader: THEMES[themeId].fragment,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      // Integrated phase that advances with input. Stays monotonic so the
      // noise never lurches backward when input ramps down.
      uShaderTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      // Initialized off-screen so themes with cursor-spatial effects don't
      // show a phantom hot spot before the user has actually moved.
      uPointer: { value: new THREE.Vector2(-9, -9) },
      // The same position, eased toward the live pointer, for themes that want
      // the cursor to drag something heavy behind it rather than snap to it.
      uPointerLag: { value: new THREE.Vector2(-9, -9) },
      // Eased follow angle for the Vibration square. Computed in the render
      // loop rather than the shader because the corner handoff is a jump in the
      // target and easing across it needs state a fragment shader can't keep.
      uSquareRot: { value: 0 },
      // One cycle of the synth's live output, 256×1, red channel, 0..1 with
      // 0.5 as silence. Repeat-wrapped so a shader can tile it directly.
      uWave: { value: null as THREE.Texture | null },
      uPointerImpulse: { value: 0 },
      uClickPos: { value: new THREE.Vector2(0, 0) },
      uClickImpulse: { value: 0 },
      // Scales the click response without touching the impulse, which doubles
      // as the wavefront's clock. Notes trigger the same channel more quietly.
      uClickStrength: { value: 1 },
      uNoteOn: { value: 0 },
      uFrequency: { value: 0 },
      uVelocity: { value: 0 },
      uEnvelope: { value: 0 },
      uScroll: { value: 0 },
      uReactivity: { value: 0.7 },
      // Per-theme visual constants (0..1 each). Each shader interprets x/y/z/w
      // in its own way to shape its look. Set each frame from the active
      // theme's fixed `shaderMacros`.
      uMacros: { value: new THREE.Vector4(0.5, 0.5, 0.5, 0.5) },
      // Per-voice color data for polyphonic audio reactivity (up to 4 notes).
      // FreqNorms: 0..1 log-scale normalized frequency, computed in JS.
      // Amts: envelope × velocity × reactivity strength per voice.
      uNoteFreqNorms: { value: new THREE.Vector4(0, 0, 0, 0) },
      uNoteAmts: { value: new THREE.Vector4(0, 0, 0, 0) },
    },
  });
}

export type BackgroundMaterial = ReturnType<typeof createBackgroundMaterial>;

/**
 * Swap the fragment shader on a live material in place. Uniforms persist,
 * so the swap is seamless from the render loop's perspective.
 */
export function applyTheme(material: BackgroundMaterial, themeId: ThemeId) {
  material.fragmentShader = THEMES[themeId].fragment;
  material.needsUpdate = true;
}
