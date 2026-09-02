import type { CSSProperties } from "react";
import { CloseGlyph, CLOSE_VIEW_BOX, PianoGlyph } from "@/components/icons";

// Both glyphs turn about the 40-unit chip's centre — the point the close cross
// is drawn around (see Close.tsx).
const CENTER = 20;

// The two glyphs cross-fade through a quarter turn in opposite directions, so
// opening reads as the mark rotating into a cross rather than two icons
// cutting. Written as inline style rather than utility classes because
// `transform-box: view-box` has to be explicit — without it, older engines
// resolve the rotation about the SVG's border box and the glyph swings
// off-center.
const glyph = (visible: boolean, hiddenDeg: number): CSSProperties => ({
  transformBox: "view-box" as const,
  transformOrigin: `${CENTER}px ${CENTER}px`,
  transform: `rotate(${visible ? 0 : hiddenDeg}deg)`,
  opacity: visible ? 1 : 0,
  transition:
    "transform 320ms cubic-bezier(0.7, 0, 0.2, 1), opacity 200ms ease-out",
});

/**
 * The chip both synth-panel toggles wear: black circle at rest, flooding
 * white — the piano's "key colour" — on hover and while the panel is up,
 * with the same glow a lit key cap throws. Shared for the same reason the
 * icon below is: two toggles, one look.
 *
 * Callers add their own layout/interaction extras (cursor, pointer-events);
 * everything visual lives here. shrink-0 because, unlike the key caps, this
 * box has no min-width: in a pinched flex row it would be the one thing that
 * deforms, and a squeezed circle reads as an egg.
 */
export function synthToggleChipClass(open: boolean) {
  return `flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,color,box-shadow] duration-100 ${
    open
      ? "border-white bg-white text-black shadow-[0_0_12px_#ffffff80]"
      : "border-black bg-black text-white/90 hover:border-white hover:bg-white hover:text-black hover:shadow-[0_0_12px_#ffffff80]"
  }`;
}

/**
 * The face both synth-panel toggles wear: a piano key that rotates into a
 * close cross while the panel is up. One component so the fixed corner
 * button and the hero row's circle can never drift apart — same mark, same
 * cross, same quarter-turn.
 *
 * Drawn on the close cross's 40-unit grid; the piano's own grid is 30 units
 * and full-bleed, so it's scaled to 21 units and centred — the inset the
 * chip's artwork carries baked in elsewhere, applied here at the call site.
 * `size` renders the whole chip box: 40 fills the toggle chips edge to edge,
 * with the ink spanning about half of that.
 */
export function SynthToggleIcon({
  open,
  size = 40,
}: {
  open: boolean;
  size?: number | string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={CLOSE_VIEW_BOX}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* The rotation style lives on the outer <g>; the inner one carries the
          30→21-unit normalisation, because a style `transform` would clobber a
          transform attribute on the same element. */}
      <g style={glyph(!open, 90)}>
        <g transform="translate(9.5 9.5) scale(0.7)">
          <PianoGlyph />
        </g>
      </g>
      <CloseGlyph style={glyph(open, -90)} />
    </svg>
  );
}
