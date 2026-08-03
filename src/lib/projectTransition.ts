/**
 * One-shot hand-off between the "All projects" menu and the project modal.
 *
 * When a menu row is clicked we stash its on-screen rectangle here, then
 * navigate to `/projects/<slug>`. `ProjectModal` consumes the rect on open and grows
 * its cream cover from that exact box (instead of the default frame expand), so
 * the click reads as the row itself expanding into the detail view. Kept as a
 * module singleton rather than in a store so reading it never triggers a
 * re-render and it can't go stale across the async mount.
 */
export type OriginRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

let originRect: OriginRect | null = null;

export function setProjectOrigin(rect: OriginRect) {
  originRect = rect;
}

/** Stash `el`'s current on-screen box as the origin the cover grows from. */
export function captureProjectOrigin(el: Element) {
  const r = el.getBoundingClientRect();
  setProjectOrigin({
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
  });
}

/** Read and clear the pending origin rect (null if the modal was opened another way). */
export function consumeProjectOrigin(): OriginRect | null {
  const r = originRect;
  originRect = null;
  return r;
}
