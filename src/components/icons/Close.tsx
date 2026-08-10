import type { SVGProps } from "react";
import { Icon, type IconProps } from "./Icon";

export const CLOSE_VIEW_BOX = "0 0 40 40";

/**
 * Bare shapes, for composing inside an existing <svg>. Lives here rather than
 * coming from lucide because it's drawn on the seal's 40-unit grid: the synth
 * toggle rotates one into the other inside a single <svg>, and a 24-grid X
 * would land at a different size and centre.
 *
 * Sized off the seal rather than the box — the cross spans half the seal's
 * outer circle and strokes 1.5× as heavy, the proportions it held before the
 * mark was redrawn with padding around it.
 */
export function CloseGlyph(props: SVGProps<SVGGElement>) {
  return (
    <g strokeWidth="1.5" {...props}>
      <path d="M13 13 27 27" />
      <path d="M27 13 13 27" />
    </g>
  );
}

export function Close(props: IconProps) {
  return (
    <Icon viewBox={CLOSE_VIEW_BOX} {...props}>
      <CloseGlyph />
    </Icon>
  );
}
