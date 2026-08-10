/**
 * Custom icons — the marks lucide doesn't have. Import from the folder, not the
 * file: `import { PhilosophersSeal } from "@/components/icons"`.
 *
 * Adding one: a file per icon exporting `<Name>` (an <Icon> wrapper, the usual
 * import) and, when something needs to compose it into an <svg> of its own,
 * `<Name>Glyph` — the bare shapes with the icon's own stroke settings on them,
 * so the two exports can't drift. Re-export both here.
 *
 * There is a static copy of the seal at /public/icons/philosophers-seal.svg for
 * non-React consumers (og images, mail signatures, anything loading a URL).
 * Edit both if the geometry changes.
 */
export { Icon, type IconProps } from "./Icon";
export {
  PhilosophersSeal,
  PhilosophersSealGlyph,
  PHILOSOPHERS_SEAL_VIEW_BOX,
  PHILOSOPHERS_SEAL_CENTER,
} from "./PhilosophersSeal";
export { Close, CloseGlyph, CLOSE_VIEW_BOX } from "./Close";
