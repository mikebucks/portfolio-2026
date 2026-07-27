/**
 * Shared "is the shader background fully covered" flag.
 *
 * The interactive WebGL background is a fixed, viewport-sized layer that is
 * always on screen, so it can't tell from its own geometry when it's occluded.
 * The one state that fully hides it is an opaque overlay painted on top — the
 * project modal grows a solid cream cover to 100vw×100vh. While that cover is up,
 * every shader frame is invisible and pure wasted GPU work.
 *
 * `ProjectModal` sets this true while mounted and false on unmount; the render
 * loop reads it imperatively each frame (like it already reads the active theme
 * via the store's `getState()`) and skips the draw when covered. Kept as a module
 * singleton rather than in a store so reading it never triggers a re-render and
 * the render loop never subscribes to React.
 */
let covered = false;

export function setBackgroundCovered(next: boolean) {
  covered = next;
}

export function isBackgroundCovered(): boolean {
  return covered;
}
