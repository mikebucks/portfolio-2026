"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { ShaderPlane } from "./ShaderPlane";
import { Particles } from "./Particles";
import {
  getClampedDpr,
  isCoarsePointer,
  prefersReducedMotion,
} from "@/lib/device";
import { visualState } from "@/lib/visualEvents";
import { onVisibilityChange } from "@/lib/performance";

export function Scene() {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [dpr, setDpr] = useState<[number, number]>([1, 1.5]);

  useEffect(() => {
    setReduced(prefersReducedMotion());
    setCoarse(isCoarsePointer());
    const cap = getClampedDpr();
    setDpr([1, cap]);
    return onVisibilityChange((visible) => setPaused(!visible));
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -((e.clientY / window.innerHeight) * 2 - 1);
      visualState.pointer[0] = x;
      visualState.pointer[1] = y;
    };
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      visualState.scroll = h > 0 ? window.scrollY / h : 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <Canvas
      frameloop={paused ? "never" : reduced ? "demand" : "always"}
      dpr={dpr}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
      }}
      camera={{ position: [0, 0, 1], fov: 60 }}
    >
      <ShaderPlane />
      {!coarse && !reduced ? <Particles /> : null}
    </Canvas>
  );
}
