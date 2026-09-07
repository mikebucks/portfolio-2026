import type { CSSProperties } from "react";
import { CloseGlyph, CLOSE_VIEW_BOX, PianoGlyph } from "@/components/icons";

// Centre of the 40-unit chip; the close cross is drawn around it (Close.tsx).
const CENTER = 20;

// Inline style: `transform-box: view-box` must be explicit, or older engines
// rotate about the border box and the glyph swings off-centre.
const glyph = (visible: boolean, hiddenDeg: number): CSSProperties => ({
  transformBox: "view-box" as const,
  transformOrigin: `${CENTER}px ${CENTER}px`,
  transform: `rotate(${visible ? 0 : hiddenDeg}deg)`,
  opacity: visible ? 1 : 0,
  transition:
    "transform 320ms cubic-bezier(0.7, 0, 0.2, 1), opacity 200ms ease-out",
});

/** The toggle chip's look. shrink-0: no min-width, so a pinched row would squash it. */
export function synthToggleChipClass(open: boolean) {
  return `flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,color,box-shadow] duration-100 ${
    open
      ? "border-black bg-black text-white shadow-[0_0_12px_#00000080]"
      : "border-white bg-white text-black/90 hover:border-black hover:bg-black hover:text-white hover:shadow-[0_0_12px_#00000080]"
  }`;
}

/**
 * Piano key that rotates into a close cross while the panel is open. The
 * piano's 30-unit grid is scaled to 21 and centred on the cross's 40-unit grid.
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
      {/* Rotation on the outer <g>: a style transform would clobber the
          transform attribute. */}
      <g style={glyph(!open, 90)}>
        <g transform="translate(9.5 9.5) scale(0.7)">
          <PianoGlyph />
        </g>
      </g>
      <CloseGlyph style={glyph(open, -90)} />
    </svg>
  );
}
