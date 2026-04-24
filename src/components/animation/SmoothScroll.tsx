"use client";

import { useLenis } from "./useLenis";

/** Tiny wrapper so the hook can live at the root layout level. */
export function SmoothScroll() {
  useLenis();
  return null;
}
