import type { SVGProps } from "react";
import { Icon, type IconProps } from "./Icon";

export const NO_TRASH_VIEW_BOX = "0 0 40 40";

type NoTrashColors = {
  ink?: string;
};

// Paths verbatim from public/icons/no-trash.svg; keep them diffable.
// Square caps: the can is butted rectangles; round caps bleed past corners.
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
      <path d="M22.4261 10.2939H17.5732V12.941H22.4261V10.2939Z" />
      <path d="M27.7208 12.9414H12.2798V15.3679H27.7208V12.9414Z" />
      <path d="M13.8237 15.7207L15.1472 26.6176H24.853L26.1766 15.7207" />
      <path d="M16.6916 29.7059C17.5444 29.7059 18.2357 29.0146 18.2357 28.1618C18.2357 27.309 17.5444 26.6177 16.6916 26.6177C15.8388 26.6177 15.1475 27.309 15.1475 28.1618C15.1475 29.0146 15.8388 29.7059 16.6916 29.7059Z" />
      <path d="M23.3097 29.7059C24.1625 29.7059 24.8538 29.0146 24.8538 28.1618C24.8538 27.309 24.1625 26.6177 23.3097 26.6177C22.4569 26.6177 21.7656 27.309 21.7656 28.1618C21.7656 29.0146 22.4569 29.7059 23.3097 29.7059Z" />
      {/* Cross ends in open air, so round caps. */}
      <path d="M9.85303 14.2646L30.147 29.2645" strokeLinecap="round" />
      <path d="M30.147 14.2646L9.85303 29.2645" strokeLinecap="round" />
    </g>
  );
}

export function NoTrash({
  plate,
  ink,
  ...props
}: IconProps &
  NoTrashColors & {
    /** Full-bleed disc behind the mark. */
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
