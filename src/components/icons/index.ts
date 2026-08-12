/**
 * Custom icons — the marks lucide doesn't have. Import from the folder, not the
 * file: `import { PhilosophersSeal } from "@/components/icons"`.
 *
 * Adding one: a file per icon exporting `<Name>` (an <Icon> wrapper, the usual
 * import) and, when something needs to compose it into an <svg> of its own,
 * `<Name>Glyph` — the bare shapes with the icon's own stroke settings on them,
 * so the two exports can't drift. Re-export both here.
 *
 * The three brand marks (seal, monogram, sigil) also have static copies under
 * /public/icons for non-React consumers (og images, mail signatures, anything
 * loading a URL). Those are the Figma exports and the source of truth for the
 * path data — edit both if the geometry changes, and keep the components'
 * `d` attributes verbatim so the next re-export diffs cleanly.
 *
 * All three are drawn on the same 40-unit grid and carry the same padding, so
 * one `size` renders them as a matched set. The footer stands them in a row.
 */
export { Icon, type IconProps } from "./Icon";
export {
  PhilosophersSeal,
  PhilosophersSealGlyph,
  PHILOSOPHERS_SEAL_VIEW_BOX,
  PHILOSOPHERS_SEAL_CENTER,
} from "./PhilosophersSeal";
export { BucksUnltd, BucksUnltdGlyph, BUCKS_UNLTD_VIEW_BOX } from "./BucksUnltd";
export { Sigil, SigilGlyph, SIGIL_VIEW_BOX } from "./Sigil";
export { NoTrash, NoTrashGlyph, NO_TRASH_VIEW_BOX } from "./NoTrash";
export {
  RecycleIC3,
  RecycleIC3Glyph,
  RECYCLE_IC3_VIEW_BOX,
} from "./RecycleIC3";
export { Close, CloseGlyph, CLOSE_VIEW_BOX } from "./Close";
