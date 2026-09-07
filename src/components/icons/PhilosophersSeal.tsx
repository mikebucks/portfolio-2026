import type { SVGProps } from "react";
import { Icon, type IconProps } from "./Icon";

export const PHILOSOPHERS_SEAL_VIEW_BOX = "0 0 40 40";

/** Rotation origin: chip centre, not the mark's bounding-box centre. */
export const PHILOSOPHERS_SEAL_CENTER = 20;

type SealColors = {
  ink?: string;
  /** Triangle fill occludes; must match the background. */
  paper?: string;
  highlight?: string;
};

// Paths verbatim from public/icons/philosophers-seal.svg; keep them diffable.
// Per-path stroke weights (1.5 / 2 / 1) are the design.
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
      {/* Circle overhangs the square on three sides. Deliberate. */}
      <path
        d="M20 16.7021C23.3137 16.7021 26 19.3884 26 22.7021C26 26.0159 23.3137 28.7021 20 28.7021C16.6863 28.7021 14 26.0159 14 22.7021C14 19.3884 16.6863 16.7021 20 16.7021Z"
        fill={highlight}
      />
    </g>
  );
}

// Mark spans ~26 of 40 units; size to the plate, not the ink.
export function PhilosophersSeal({
  plate,
  ink,
  paper,
  highlight,
  ...props
}: IconProps &
  SealColors & {
    /** Full-bleed disc behind the mark. */
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
