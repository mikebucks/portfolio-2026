import type { SVGProps } from "react";
import { Icon, type IconProps } from "./Icon";

/** Same 40-unit grid as the other marks, so a shared `size` lines them up. */
export const NO_TRASH_VIEW_BOX = "0 0 40 40";

type NoTrashColors = {
  /** Every stroke, and the bar under the can. */
  ink?: string;
};

/**
 * Bare shapes, for callers that need them inside an <svg> they already own.
 * Everything else wants <NoTrash />.
 *
 * Path data is verbatim from the Figma export (public/icons/no-trash.svg); only
 * the hard-coded colour is lifted into a prop.
 *
 * Square caps, unlike the rest of this folder: the can is built from butted
 * rectangles and a round cap would bleed past every corner. The two strokes of
 * the cross are the exception and say so locally — they're the one part of the
 * mark that ends in open air, where a square cap reads as a clipped edge.
 */
export function NoTrashGlyph({
  ink = "currentColor",
  ...props
}: SVGProps<SVGGElement> & NoTrashColors) {
  return (
    <g
      fill="none"
      stroke={ink}
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="round"
      {...props}
    >
      {/* Lid handle, lid, then the tapered body. */}
      <path d="M22.4261 10.2939H17.5732V12.941H22.4261V10.2939Z" />
      <path d="M27.7208 12.9414H12.2798V15.3679H27.7208V12.9414Z" />
      <path d="M13.8237 15.7207L15.1472 26.6176H24.853L26.1766 15.7207" />
      {/* The two wheels. */}
      <path d="M16.6916 29.7059C17.5444 29.7059 18.2357 29.0146 18.2357 28.1618C18.2357 27.309 17.5444 26.6177 16.6916 26.6177C15.8388 26.6177 15.1475 27.309 15.1475 28.1618C15.1475 29.0146 15.8388 29.7059 16.6916 29.7059Z" />
      <path d="M23.3097 29.7059C24.1625 29.7059 24.8538 29.0146 24.8538 28.1618C24.8538 27.309 24.1625 26.6177 23.3097 26.6177C22.4569 26.6177 21.7656 27.309 21.7656 28.1618C21.7656 29.0146 22.4569 29.7059 23.3097 29.7059Z" />
      {/* The cross. Wider than the can it strikes through, so it reads as
          negation rather than as part of the drawing. */}
      <path d="M9.85303 14.2646L30.147 29.2645" strokeLinecap="round" />
      <path d="M30.147 14.2646L9.85303 29.2645" strokeLinecap="round" />
    </g>
  );
}

/**
 * No trash.
 *
 * The redraw dropped the ground bar and pulled the whole mark in to roughly 10
 * to 30 of the 40 units, centred — so it now carries the same padding as the
 * seal and sits on a row's baseline without reading bottom-heavy.
 */
export function NoTrash({
  plate,
  ink,
  ...props
}: IconProps &
  NoTrashColors & {
    /** Draw the full-bleed disc behind the mark. Off by default, matching the
     *  rest of the folder: the export draws one, but every consumer so far
     *  paints its own surface (the footer stands these on the ink) and an
     *  opaque disc would punch a hole in it. */
    plate?: string | boolean;
  }) {
  return (
    <Icon viewBox={NO_TRASH_VIEW_BOX} {...props}>
      {plate ? (
        <rect
          width="40"
          height="40"
          rx="20"
          fill={typeof plate === "string" ? plate : "#FFFFFF"}
          stroke="none"
        />
      ) : null}
      <NoTrashGlyph ink={ink} />
    </Icon>
  );
}
