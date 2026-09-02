"use client";

import { useUIStore } from "@/lib/store";
import { SynthKeyCap } from "./SynthKeyCap";
import { SynthToggleIcon, synthToggleChipClass } from "./SynthToggleIcon";
import { primeAudioContext } from "./primeAudioContext";

// Just the first four keys, not the full mapping: enough to say "these play",
// with the panel one press away for the rest.
const HERO_KEYS = ["a", "s", "d", "f"];

/**
 * The synth's front door: a playable A S D F strip under the hero headline,
 * capped with a piano-key button that opens the panel. The fixed seal toggle
 * (SynthToggleButton) never got pressed — nothing said it did anything, let
 * alone made sound. Key caps that light up and play on hover do.
 *
 * The caps are real SynthKeyCaps, so they walk the same synthetic-keydown path
 * as a physical press and stay lit in sync with the footer's strip and the
 * panel's keyboard.
 */
export function HeroSynthKeys() {
  const open = useUIStore((s) => s.synthPanelOpen);
  const toggle = useUIStore((s) => s.toggleSynthPanel);

  return (
    <div className="flex items-center gap-1.5">
      {HERO_KEYS.map((k) => (
        <SynthKeyCap key={k} keyName={k} size="md" tone="solid" showNote />
      ))}
      <button
        type="button"
        // Priming inside the tap for the same iOS reason as SynthToggleButton:
        // the panel-open path runs unlock from a passive effect, after this
        // tap's activation is gone.
        onClick={() => {
          primeAudioContext();
          toggle();
        }}
        // Marks this as a panel control, so the panel's press-outside-to-dismiss
        // handler leaves the click to toggle instead of racing it.
        data-synth-toggle
        aria-pressed={open}
        aria-label={open ? "Close synth panel" : "Open synth panel"}
        title={open ? "Close synth" : "Open synth"}
        // Same solid black plate as the caps beside it, but a circle where they
        // are squares: same family, different action. Chip look + piano-into-
        // cross face both shared with the fixed corner toggle — see
        // SynthToggleIcon for the classes (incl. why shrink-0 matters here).
        className={`cursor-pointer ${synthToggleChipClass(open)}`}
      >
        {/* 36, not the chip-filling 40: this circle draws its own 1px border,
            so the icon stays just inside it. Ink spans about half the box. */}
        <SynthToggleIcon open={open} size={30} />
      </button>
    </div>
  );
}
