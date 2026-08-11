import type { SVGProps } from "react";
import { Icon, type IconProps } from "./Icon";

/** The grid the seal is drawn on — exported so composers can match it. */
export const PHILOSOPHERS_SEAL_VIEW_BOX = "0 0 40 40";

/** The box's centre, and the origin any rotation of the mark should turn about.
 *  Not the mark's own bounding-box centre — the triangle's is a couple of units
 *  higher — but the centre of the 40-unit chip, which is what the close cross is
 *  drawn about too. Turning both glyphs about the same point is the whole trick
 *  in the synth toggle's cross-fade. */
export const PHILOSOPHERS_SEAL_CENTER = 20;

type SealColors = {
  /** Strokes and the solid square. */
  ink?: string;
  /** The triangle the ink sits on — this fill occludes, so it has to match
   *  whatever is behind the mark or the hidden edges show through. */
  paper?: string;
  /** The inner circle, a hair warmer than `paper` in the source artwork. */
  highlight?: string;
};

/**
 * Bare shapes, for callers that need them inside an <svg> they already own —
 * the synth toggle wraps them in an animated <g> that cross-fades with a close
 * cross on the same grid. Everything else wants <PhilosophersSeal />.
 *
 * Path data is verbatim from the Figma export (public/icons/philosophers-seal.svg)
 * so a re-export diffs cleanly; only the hard-coded colours are lifted into
 * props. `ink` defaults to currentColor rather than the export's black, which is
 * what lets the synth toggle keep animating the mark's colour on hover.
 *
 * Stroke weight is per-path, not on the <g>: the redraw gives the three shapes
 * three different weights (triangle 1.5, square 2, circle 1) and that hierarchy
 * is the design. The <g> carries the lightest as the default so the circle can
 * stay bare, and so an `<svg strokeWidth>` above this can never leak in.
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
        d="M19.9995 6.6499C20.2675 6.6499 20.5159 6.79277 20.6499 7.0249L32.8833 28.2251C33.0172 28.4571 33.0172 28.7431 32.8833 28.9751C32.7494 29.207 32.5017 29.35 32.2339 29.3501H7.76611C7.49821 29.3501 7.25069 29.2071 7.1167 28.9751C6.98271 28.7431 6.98279 28.4572 7.1167 28.2251L19.3501 7.0249L19.4058 6.94189C19.5465 6.75928 19.7653 6.65001 19.9995 6.6499Z"
        fill={paper}
        strokeWidth="1.5"
      />
      <path
        d="M25.6998 16.6685H14.2998V28.0664H25.6998V16.6685Z"
        fill={ink}
        strokeWidth="2"
      />
      {/* Drawn a touch proud of the square on three sides — it breaks the
          silhouette at the left, right and bottom edges rather than sitting
          inscribed. Deliberate; don't "fix" it back to the square's bounds. */}
      <path
        d="M20 16.7021C23.3137 16.7021 26 19.3884 26 22.7021C26 26.0159 23.3137 28.7021 20 28.7021C16.6863 28.7021 14 26.0159 14 22.7021C14 19.3884 16.6863 16.7021 20 16.7021Z"
        fill={highlight}
      />
    </g>
  );
}

/**
 * Triangle, square, circle — the site's mark.
 *
 * The mark is inset from its box: the artwork was drawn inside the synth
 * toggle's 40px chip, so the triangle — the widest shape, and now the outermost
 * since the redraw dropped the enclosing circle — spans about 26 of the 40
 * units. Size it to the plate you're putting it on, not to the ink you want to
 * see.
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
