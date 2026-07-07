"use client";

import { useSynthControls } from "./useSynthControls";

/**
 * Mounts the keyboard→synth wiring app-wide. Rendered once inside
 * `AudioProvider` (in the root layout) so the playable synth works on every
 * page, not just the home hero. Renders nothing.
 */
export function SynthKeyboard() {
  useSynthControls();
  return null;
}
