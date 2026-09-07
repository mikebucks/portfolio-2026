import type { SVGProps } from "react";
import { Icon, type IconProps } from "./Icon";

export const CLOSE_VIEW_BOX = "0 0 40 40";

// Not lucide: drawn on the 40-unit grid so the synth toggle can cross-fade it
// with the piano glyph about the same centre.
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
