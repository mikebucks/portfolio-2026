import * as THREE from "three";
import { sharedVertex, THEME_PRESETS, type ThemeId } from "./shaders/themes";

export function createBackgroundMaterial(themeId: ThemeId) {
  return new THREE.ShaderMaterial({
    vertexShader: sharedVertex,
    fragmentShader: THEME_PRESETS[themeId].fragment,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      // Monotonic; advances faster on input.
      uShaderTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      // Off-screen until first move: no phantom hot spot.
      uPointer: { value: new THREE.Vector2(-9, -9) },
      uPointerLag: { value: new THREE.Vector2(-9, -9) },
      // Vibration square angle; eased in JS since the corner handoff needs state.
      uSquareRot: { value: 0 },
      // Polarity camera elevation 0..1, eased in JS.
      uViewTilt: { value: 0 },
      // Correspondence divide normal, radians. Rest 3π/4 = BL→TR diagonal.
      uDivideAngle: { value: (3 * Math.PI) / 4 },
      // One synth cycle, 256×1 red, 0.5 = silence, repeat-wrapped.
      uWave: { value: null as THREE.Texture | null },
      uPointerImpulse: { value: 0 },
      uClickPos: { value: new THREE.Vector2(0, 0) },
      uClickImpulse: { value: 0 },
      // Scales click response; impulse itself is the wavefront clock.
      uClickStrength: { value: 1 },
      uNoteOn: { value: 0 },
      // Same pulse that sets uShaderTime's rate; lets shaders sync to it.
      uNotePulse: { value: 0 },
      uFrequency: { value: 0 },
      uVelocity: { value: 0 },
      uEnvelope: { value: 0 },
      uScroll: { value: 0 },
      uReactivity: { value: 0.7 },
      // Per-theme constants from the preset's shaderMacros.
      uMacros: { value: new THREE.Vector4(0.5, 0.5, 0.5, 0.5) },
      // Rhythm only: 0 wave … 1 mandala, spring-eased in JS.
      uFormMorph: { value: 0 },
      // Fader offsets from preset: x volume, y cutoff, z reverb, w delay, -1..1.
      uSynth: { value: new THREE.Vector4(0, 0, 0, 0) },
      // Rhythm only: eased pendulum count (target even, 8..32).
      uPendCount: { value: 26 },
      // Rhythm only: x wave phase clock (JS-integrated), y rate factor.
      uWaveClock: { value: new THREE.Vector2(0, 1) },
      // Per voice (4): log-normalized freq 0..1, and envelope × velocity × reactivity.
      uNoteFreqNorms: { value: new THREE.Vector4(0, 0, 0, 0) },
      uNoteAmts: { value: new THREE.Vector4(0, 0, 0, 0) },
    },
  });
}

export type BackgroundMaterial = ReturnType<typeof createBackgroundMaterial>;

/** Swap the fragment shader in place; uniforms persist. */
export function applyTheme(material: BackgroundMaterial, themeId: ThemeId) {
  material.fragmentShader = THEME_PRESETS[themeId].fragment;
  material.needsUpdate = true;
}
