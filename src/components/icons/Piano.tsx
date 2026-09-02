import type { SVGProps } from "react";
import { Icon, type IconProps } from "./Icon";

/** The grid the piano is drawn on — exported so composers can match it. */
export const PIANO_VIEW_BOX = "0 0 30 30";

/** The raw path, for renderers that can't take the React glyph — the OG card
 *  runs under Satori, where a bare <path d fill> is the reliable subset. */
export const PIANO_PATH =
  "M22.926 0L20.538 0L18.87 0L16.602 0L13.41 0L11.112 0L9.408 0L7.086 0L2 0C0.895431 0 0 0.895431 0 2L0 27.652C0 28.7566 0.89543 29.652 2 29.652H9.42H11.124L18.876 29.652H20.544H28C29.1046 29.652 30 28.7566 30 27.652L30 2C30 0.895433 29.1046 0 28 0L22.926 0ZM1.668 26.1926L1.668 3.674C1.668 2.56943 2.56343 1.674 3.668 1.674L5.104 1.674C6.20857 1.674 7.104 2.56943 7.104 3.674L7.104 15.567C7.104 16.2082 7.6238 16.728 8.265 16.728C8.9062 16.728 9.426 17.2478 9.426 17.889L9.426 25.996C9.426 27.1006 8.53057 27.996 7.426 27.996H3.47139C2.47541 27.996 1.668 27.1886 1.668 26.1926ZM11.118 26.2508L11.118 17.871C11.118 17.2364 11.6324 16.722 12.267 16.722C12.9016 16.722 13.416 16.2076 13.416 15.573L13.416 3.27C13.416 2.38855 14.1306 1.674 15.012 1.674C15.8934 1.674 16.608 2.38855 16.608 3.27L16.608 15.594C16.608 16.2203 17.1157 16.728 17.742 16.728C18.3683 16.728 18.876 17.2357 18.876 17.862V25.996C18.876 27.1006 17.9806 27.996 16.876 27.996L12.8632 27.996C11.8994 27.996 11.118 27.2146 11.118 26.2508ZM26.9301 27.99C26.8975 27.99 24.4089 27.99 22.5499 27.99C21.4453 27.99 20.55 27.0946 20.55 25.99V17.913C20.55 17.2552 21.0832 16.722 21.741 16.722C22.3988 16.722 22.932 16.1888 22.932 15.531L22.932 3.674C22.932 2.56943 23.8274 1.674 24.932 1.674L26.338 1.674C27.4426 1.674 28.338 2.56943 28.338 3.674L28.338 26.5821C28.338 27.3596 27.7076 27.99 26.9301 27.99Z";

/**
 * Bare shapes, for callers that need them inside an <svg> they already own —
 * the synth toggles wrap this in an animated <g> that cross-fades with the
 * close cross (see SynthToggleIcon). Everything else wants <Piano />.
 *
 * Unlike the rest of the folder this is a filled mark, not a stroked one: one
 * path, three keys knocked out of a solid plate by winding. The <g> pins
 * `stroke="none"` so an `<svg strokeWidth>` above it can't outline the keys,
 * and lifts the export's #010101 to currentColor so buttons can animate it.
 *
 * Path data is verbatim from the export (public/icons/piano.svg) so a
 * re-export diffs cleanly. Full-bleed on its 30-unit grid — no baked-in
 * padding, so inset it yourself when it sits on a plate.
 */
export function PianoGlyph(props: SVGProps<SVGGElement>) {
  return (
    <g fill="currentColor" stroke="none" {...props}>
      <path d={PIANO_PATH} />
    </g>
  );
}

export function Piano(props: IconProps) {
  return (
    <Icon viewBox={PIANO_VIEW_BOX} {...props}>
      <PianoGlyph />
    </Icon>
  );
}
