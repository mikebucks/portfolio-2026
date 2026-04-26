import * as THREE from "three";
import { backgroundFragment, backgroundVertex } from "./shaders/background";

export function createBackgroundMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: backgroundVertex,
    fragmentShader: backgroundFragment,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPointerImpulse: { value: 0 },
      uClickPos: { value: new THREE.Vector2(0, 0) },
      uClickImpulse: { value: 0 },
      uNoteOn: { value: 0 },
      uFrequency: { value: 0 },
      uVelocity: { value: 0 },
      uEnvelope: { value: 0 },
      uScroll: { value: 0 },
      uReactivity: { value: 0.7 },
    },
  });
}

export type BackgroundMaterial = ReturnType<typeof createBackgroundMaterial>;
