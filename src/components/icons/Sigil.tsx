import type { SVGProps } from "react";
import { Icon, type IconProps } from "./Icon";

/** Same 40-unit grid as the seal, so the two line up in a row without scaling. */
export const SIGIL_VIEW_BOX = "0 0 40 40";

type SigilColors = {
  /** Every stroke, and the two terminal dots. */
  ink?: string;
};

/**
 * Bare shapes, for callers that need them inside an <svg> they already own.
 * Everything else wants <Sigil />.
 *
 * Path data is verbatim from the Figma export (public/icons/sigilsvg.svg); only
 * the hard-coded colour is lifted into a prop. Like the seal, the weights are
 * per-path — the serpent's spine is 1.5 and everything it passes through is 1,
 * which is what keeps the crossings readable at 40px.
 */
export function SigilGlyph({
  ink = "currentColor",
  ...props
}: SVGProps<SVGGElement> & SigilColors) {
  return (
    <g
      fill="none"
      stroke={ink}
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path
        d="M24.9954 9.65189C26.3557 8.49454 25.967 6.56562 24.218 5.98695C22.0803 5.31183 19.7483 6.75851 19.8455 9.2661C20.0398 16.596 20.0398 19.2965 19.9427 27.3979C19.8455 32.4131 16.639 35.3065 13.5296 33.7633C11.5863 32.7989 11.4891 30.2913 13.3353 29.5197"
        strokeWidth="1.5"
      />
      <path d="M19.6946 10.269C13.3653 11.6651 10.0248 17.2494 11.6072 22.6591C12.1067 24.367 13.4145 26.4812 16.2026 27.6504" />
      <path d="M19.7631 29.7092C26.1596 28.6636 29.8024 23.2717 28.5202 17.783C28.1154 16.0503 26.926 13.8672 24.2065 12.5464" />
      <path d="M16.8018 17.873C19.2635 19.3857 20.553 21.0146 23.1319 22.4109" />
      {/* The two ends. Filled, not stroked — a stroked dot at this size would
          swell by the full stroke width and stop matching the artwork. */}
      <path
        d="M16.3813 28.5688C16.8924 28.5688 17.3066 28.1576 17.3066 27.6503C17.3066 27.1431 16.8924 26.7319 16.3813 26.7319C15.8703 26.7319 15.4561 27.1431 15.4561 27.6503C15.4561 28.1576 15.8703 28.5688 16.3813 28.5688Z"
        fill={ink}
        stroke="none"
      />
      <path
        d="M24.0571 13.4843C24.5681 13.4843 24.9824 13.0731 24.9824 12.5659C24.9824 12.0586 24.5681 11.6475 24.0571 11.6475C23.5461 11.6475 23.1318 12.0586 23.1318 12.5659C23.1318 13.0731 23.5461 13.4843 24.0571 13.4843Z"
        fill={ink}
        stroke="none"
      />
    </g>
  );
}

/**
 * The sigil.
 *
 * Drawn with the same padding as the seal — the ink spans roughly 10 to 34 of
 * the 40 units — so at a shared `size` the two read as the same weight.
 */
export function Sigil({
  plate,
  ink,
  ...props
}: IconProps &
  SigilColors & {
    /** Draw the full-bleed disc behind the mark. Off by default, matching
     *  <PhilosophersSeal /> — a caller painting its own chip doesn't want it. */
    plate?: string | boolean;
  }) {
  return (
    <Icon viewBox={SIGIL_VIEW_BOX} {...props}>
      {plate ? (
        <rect
          width="40"
          height="40"
          rx="20"
          fill={typeof plate === "string" ? plate : "#FFFFFF"}
          stroke="none"
        />
      ) : null}
      <SigilGlyph ink={ink} />
    </Icon>
  );
}
