import type { SVGProps } from "react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "viewBox" | "children"> & {
  /** Rendered box in px. Icons are square, so this sets width and height. */
  size?: number | string;
};

type BaseIconProps = IconProps & {
  viewBox?: string;
  children?: SVGProps<SVGSVGElement>["children"];
};

/**
 * The <svg> shell every icon in this folder shares: sized square, stroked in
 * `currentColor` so an icon inherits whatever text colour its button or link
 * already animates, and hidden from the a11y tree by default — icons here are
 * decorative next to a label or an aria-label on the control itself. Pass
 * `aria-hidden={false}` with a `role`/`aria-label` for the rare standalone use.
 *
 * Icons declare their own viewBox rather than being normalised onto one grid:
 * the seal is drawn on a 20-unit grid and the geometry is tuned to it. Because
 * `size` drives width/height, mixed-grid icons still render at a matching size.
 */
export function Icon({
  size = 24,
  viewBox = "0 0 24 24",
  strokeWidth = 1.5,
  children,
  ...props
}: BaseIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}
