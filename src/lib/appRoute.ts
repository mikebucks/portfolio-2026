"use client";

// URL <-> homepage state. Every URL renders the same homepage tree, so the URL
// is driven by the History API, not Next's router: router.push would remount
// the WebGL background and intro. usePathname still follows a bare pushState.

export const SECTION_IDS = ["projects", "about", "contact"] as const;

export type SectionId = (typeof SECTION_IDS)[number];

const SECTION_ID_SET: ReadonlySet<string> = new Set(SECTION_IDS);

export function isSectionId(value: string): value is SectionId {
  return SECTION_ID_SET.has(value);
}

export type AppRoute = {
  /** null for the hero (`/`). */
  section: SectionId | null;
  slug: string | null;
};

const HERO: AppRoute = { section: null, slug: null };

/** null if the homepage doesn't own the URL. Slug is unvalidated. */
export function parseRoute(pathname: string): AppRoute | null {
  const [head, next, ...extra] = pathname.split("/").filter(Boolean);
  if (extra.length > 0) return null;
  if (!head) return HERO;
  if (!isSectionId(head)) return null;
  if (!next) return { section: head, slug: null };
  if (head !== "projects") return null;
  return { section: head, slug: decodeURIComponent(next) };
}

export function isHomeUrl(pathname: string): boolean {
  return parseRoute(pathname) !== null;
}

export function currentRoute(): AppRoute {
  return parseRoute(window.location.pathname) ?? HERO;
}

const ROUTE_EVENT = "app:routechange";

// `notify: false` when the URL only mirrors scroll position; otherwise the
// URL -> scroll subscriber feeds back into a scroll loop.
export function navigate(path: string, { replace = false, notify = true } = {}) {
  const current = window.location.pathname + window.location.hash;
  if (path === current) return;
  if (replace) history.replaceState(null, "", path);
  else history.pushState(null, "", path);
  if (notify) window.dispatchEvent(new Event(ROUTE_EVENT));
}

export function sectionPath(section: SectionId | null): string {
  return section ? `/${section}` : "/";
}

export function projectPath(slug: string): string {
  return `/projects/${encodeURIComponent(slug)}`;
}

/** Returns an unsubscribe. */
export function onRouteChange(handler: () => void): () => void {
  window.addEventListener("popstate", handler);
  window.addEventListener(ROUTE_EVENT, handler);
  return () => {
    window.removeEventListener("popstate", handler);
    window.removeEventListener(ROUTE_EVENT, handler);
  };
}
