"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { createBackgroundMaterial } from "./materials/backgroundMaterial";
import { tickVisualState, visualState } from "@/lib/visualEvents";

export function ShaderPlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const material = useMemo(() => createBackgroundMaterial(), []);
  const size = useThree((s) => s.size);

  useFrame((_, dt) => {
    tickVisualState(dt);
    const u = material.uniforms;
    u.uTime.value += dt;
    u.uResolution.value.set(size.width, size.height);
    u.uPointer.value.set(visualState.pointer[0], visualState.pointer[1]);
    u.uScroll.value = visualState.scroll;
    u.uNoteOn.value = visualState.noteImpulse;
    u.uEnvelope.value = visualState.envelope;
    u.uFrequency.value = visualState.frequency;
    u.uVelocity.value = visualState.velocity;
    u.uFilterCutoff.value = visualState.filterCutoff;
    u.uReactivity.value = visualState.reactivity;
  });

  return (
    <mesh ref={meshRef} frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
