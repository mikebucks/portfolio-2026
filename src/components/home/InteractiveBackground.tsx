"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { hasWebGL, prefersReducedMotion } from "@/lib/device";

const Scene = dynamic(
  () => import("@/components/webgl/Scene").then((m) => m.Scene),
  { ssr: false },
);

/**
 * Full-bleed background. Renders WebGL when supported & motion isn't reduced,
 * otherwise a cheap CSS gradient so the page still feels alive.
 */
export function InteractiveBackground() {
  const [canRender, setCanRender] = useState<null | boolean>(null);

  useEffect(() => {
    setCanRender(hasWebGL() && !prefersReducedMotion());
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black"
    >
      {canRender === true ? (
        <Scene />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(212,255,58,0.06),transparent_60%),radial-gradient(ellipse_at_70%_80%,rgba(80,120,255,0.08),transparent_60%)]" />
      )}
    </div>
  );
}
