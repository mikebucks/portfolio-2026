"use client";

import { useSynthControls } from "./useSynthControls";

/** Mounts the keyboard→synth wiring app-wide (once, in AudioProvider). Renders nothing. */
export function SynthKeyboard() {
  useSynthControls();
  return null;
}
