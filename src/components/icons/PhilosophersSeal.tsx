import type { SVGProps } from "react";
import { Icon, type IconProps } from "./Icon";

/** The grid the seal is drawn on — exported so composers can match it. */
export const PHILOSOPHERS_SEAL_VIEW_BOX = "0 0 40 40";

/** The seal's centre, i.e. the origin any rotation of it should turn about. */
export const PHILOSOPHERS_SEAL_CENTER = 20;

type SealColors = {
  /** Strokes and the solid square. */
  ink?: string;
  /** The disc and triangle the ink sits on — these fills occlude, so they have
   *  to match whatever is behind the mark or the hidden edges show through. */
  paper?: string;
  /** The inner circle, a hair warmer than `paper` in the source artwork. */
  highlight?: string;
};

/**
 * Bare shapes, for callers that need them inside an <svg> they already own —
 * the synth toggle wraps them in an animated <g> that cross-fades with a close
 * cross on the same grid. Everything else wants <PhilosophersSeal />.
 *
 * Path data is verbatim from the Figma export (design/philosophers-seal.svg) so
 * a re-export diffs cleanly; only the hard-coded colours are lifted into props.
 * `ink` defaults to currentColor rather than the export's black, which is what
 * lets the synth toggle keep animating the mark's colour on hover.
 */
export function PhilosophersSealGlyph({
  ink = "currentColor",
  paper = "#FFFFFF",
  highlight = "#FFF9F9",
  ...props
}: SVGProps<SVGGElement> & SealColors) {
  return (
    <g stroke={ink} strokeWidth="1" strokeLinejoin="round" {...props}>
      <path
        d="M20.0001 34.1335C27.8058 34.1335 34.1335 27.8058 34.1335 20.0001C34.1335 12.1944 27.8058 5.8667 20.0001 5.8667C12.1944 5.8667 5.8667 12.1944 5.8667 20.0001C5.8667 27.8058 12.1944 34.1335 20.0001 34.1335Z"
        fill={paper}
      />
      <path
        d="M19.9999 5.8667L32.2336 27.0668H7.76611L19.9999 5.8667Z"
        fill={paper}
      />
      <path
        d="M25.6987 15.6685H14.3008V27.0664H25.6987V15.6685Z"
        fill={ink}
      />
      <path
        d="M19.9997 27.0664C23.1472 27.0664 25.6987 24.5149 25.6987 21.3674C25.6987 18.22 23.1472 15.6685 19.9997 15.6685C16.8523 15.6685 14.3008 18.22 14.3008 21.3674C14.3008 24.5149 16.8523 27.0664 19.9997 27.0664Z"
        fill={highlight}
      />
    </g>
  );
}

/**
 * Circle, triangle, square, circle — the site's mark.
 *
 * The mark is inset from its box: the artwork was drawn inside the synth
 * toggle's 40px chip, so the outer circle only spans 28 of the 40 units. Size
 * it to the plate you're putting it on, not to the ink you want to see.
 */
export function PhilosophersSeal({
  plate,
  ink,
  paper,
  highlight,
  ...props
}: IconProps &
  SealColors & {
    /** Draw the full-bleed disc behind the mark. Off by default — the synth
     *  toggle paints its own chip, which it animates between light and dark. */
    plate?: string | boolean;
  }) {
  return (
    <Icon viewBox={PHILOSOPHERS_SEAL_VIEW_BOX} {...props}>
      {plate ? (
        <rect
          width="40"
          height="40"
          rx="20"
          fill={typeof plate === "string" ? plate : (paper ?? "#FFFFFF")}
          stroke="none"
        />
      ) : null}
      <PhilosophersSealGlyph ink={ink} paper={paper} highlight={highlight} />
    </Icon>
  );
}
