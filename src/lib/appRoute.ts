"use client";

/**
 * URL <-> homepage-state mapping for the single-page site.
 *
 * Every URL the site serves — `/`, `/projects`, `/about`, `/contact` and
 * `/projects/<slug>` — renders the same homepage tree (see src/app/**). Moving
 * between them is a scroll or a modal, never a route change, so the URL is
 * driven by the History API directly rather than by Next's router: `router.push`
 * would swap the route tree and remount the WebGL background and intro
 * sequence. Next.js treats a bare `history.pushState` / `replaceState` as a
 * shallow URL update — `usePathname()` follows along, but the server components
 * are not re-rendered.
 *
 * `pushState` fires no event of its own, so `navigate()` emits one; subscribers
 * take that plus `popstate` (browser back/forward) via `onRouteChange`.
 */

/** Homepage section ids, in document order. */
export const SECTION_IDS = ["projects", "about", "contact"] as const;

export type SectionId = (typeof SECTION_IDS)[number];

const SECTION_ID_SET: ReadonlySet<string> = new Set(SECTION_IDS);

export function isSectionId(value: string): value is SectionId {
  return SECTION_ID_SET.has(value);
}

export type AppRoute = {
  /** Section the URL points at, or null for the hero (`/`). */
  section: SectionId | null;
  /** Project slug for `/projects/<slug>`, or null when no project is open. */
  slug: string | null;
};

const HERO: AppRoute = { section: null, slug: null };

/**
 * Parse a pathname into homepage coordinates, or null if the homepage doesn't
 * own that URL. Note that a slug here is only well-formed, not necessarily
 * real — `ProjectModal` is what checks it against the project data.
 */
export function parseRoute(pathname: string): AppRoute | null {
  const [head, next, ...extra] = pathname.split("/").filter(Boolean);
  if (extra.length > 0) return null;
  if (!head) return HERO;
  if (!isSectionId(head)) return null;
  if (!next) return { section: head, slug: null };
  // Only projects nest; there is no `/about/<anything>`.
  if (head !== "projects") return null;
  return { section: head, slug: decodeURIComponent(next) };
}

/** True for the URLs the homepage tree serves. */
export function isHomeUrl(pathname: string): boolean {
  return parseRoute(pathname) !== null;
}

export function currentRoute(): AppRoute {
  return parseRoute(window.location.pathname) ?? HERO;
}

const ROUTE_EVENT = "app:routechange";

/**
 * Move to `path` without leaving the page. `replace` swaps the current history
 * entry instead of stacking a new one — used for URL changes the user didn't
 * ask for (scroll position mirroring, closing a modal), so Back still means
 * "the last thing I clicked".
 */
export function navigate(path: string, { replace = false } = {}) {
  const current = window.location.pathname + window.location.hash;
  if (path === current) return;
  if (replace) history.replaceState(null, "", path);
  else history.pushState(null, "", path);
  window.dispatchEvent(new Event(ROUTE_EVENT));
}

/** Path for a section, or the hero when `section` is null. */
export function sectionPath(section: SectionId | null): string {
  return section ? `/${section}` : "/";
}

export function projectPath(slug: string): string {
  return `/projects/${encodeURIComponent(slug)}`;
}

/** Subscribe to every URL change this app can make. Returns an unsubscribe. */
export function onRouteChange(handler: () => void): () => void {
  window.addEventListener("popstate", handler);
  window.addEventListener(ROUTE_EVENT, handler);
  return () => {
    window.removeEventListener("popstate", handler);
    window.removeEventListener(ROUTE_EVENT, handler);
  };
}
