import type { SVGProps } from "react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "viewBox" | "children"> & {
  /** Sets width and height. */
  size?: number | string;
};

type BaseIconProps = IconProps & {
  viewBox?: string;
  children?: SVGProps<SVGSVGElement>["children"];
};

// Shared <svg> shell. aria-hidden by default; pass aria-hidden={false} plus a
// role/aria-label for standalone use.
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
