import * as THREE from "three";
import vertexShader from "./shaders/background.vert";
import fragmentShader from "./shaders/background.frag";

export function createBackgroundMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uNoteOn: { value: 0 },
      uFrequency: { value: 0 },
      uVelocity: { value: 0 },
      uEnvelope: { value: 0 },
      uFilterCutoff: { value: 0.6 },
      uReactivity: { value: 0.7 },
      uResolution: { value: new THREE.Vector2(1, 1) },
    },
  });
}

export type BackgroundMaterial = ReturnType<typeof createBackgroundMaterial>;
