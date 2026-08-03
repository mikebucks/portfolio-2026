"use client";

/**
 * Mixpanel wrapper — the single place the app talks to analytics.
 *
 * Design mirrors the Web3Forms integration: the token is read from a public
 * `NEXT_PUBLIC_` env var, and when it's absent EVERYTHING here is a silent
 * no-op. No script loads, no network calls fire, no console noise. So the site
 * runs identically with or without analytics configured, and a fork without
 * the token isn't quietly broken.
 *
 * The token is send-only (it lets a browser POST events; it can't read data
 * back), so shipping it client-side is safe and expected — same rationale as
 * the Web3Forms access key.
 *
 * Every wiring detail (which DOM events, how mouse movement is sampled) lives
 * in `src/components/analytics/Analytics.tsx`. This file is only the transport:
 * init, identity, and `track`.
 */

import mixpanel, { type Dict } from "mixpanel-browser";
import { SITE } from "./siteMeta";

const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

/** Init runs once; guards against React StrictMode's double-mount in dev. */
let initialized = false;

/** True only when a token is present — the master on/off switch. */
export function isAnalyticsEnabled(): boolean {
  return Boolean(TOKEN);
}

/**
 * Boot Mixpanel. Safe to call more than once (subsequent calls are ignored)
 * and safe to call with no token (returns immediately). Returns whether
 * analytics is live, so callers can skip attaching listeners when it isn't.
 */
export function initAnalytics(): boolean {
  if (initialized) return true;
  if (!TOKEN || typeof window === "undefined") return false;

  mixpanel.init(TOKEN, {
    // We drive SPA pageviews by hand off the History-API router
    // (see appRoute.onRouteChange), so Mixpanel's own auto-pageview — which
    // only sees the first hard load — is turned off to avoid double counts.
    track_pageview: false,
    // localStorage keeps the distinct_id and super properties stable across
    // reloads and tabs, so a visit reads as one person, not many.
    persistence: "localStorage",
    // Loud in dev, quiet in prod.
    debug: process.env.NODE_ENV !== "production",
    // Batch events and flush on a short interval instead of one XHR per event.
    // Essential here: the mouse/scroll firehose below would otherwise open a
    // request per sample.
    batch_requests: true,
    // Mixpanel's built-in autocapture is left OFF on purpose — this app does
    // its own, richer capture (element descriptors, mouse paths) in
    // Analytics.tsx. Turning both on would double every click.
    autocapture: false,
  });

  // Super properties ride along on every event automatically, so each event
  // is self-describing in the Mixpanel UI without repeating this at each call.
  mixpanel.register({
    site: SITE.name,
    app: "portfolio-2026",
    viewport_w: window.innerWidth,
    viewport_h: window.innerHeight,
  });

  initialized = true;
  return true;
}

/**
 * Fire an event. No-op until `initAnalytics` has succeeded, so callers never
 * have to null-check. `props` are merged on top of Mixpanel's defaults and the
 * super properties registered above.
 */
export function track(event: string, props?: Dict): void {
  if (!initialized) return;
  mixpanel.track(event, props);
}

/**
 * Associate the current anonymous visitor with a stable id (e.g. after a
 * contact-form submit that carries an email). Optional — the site tracks fine
 * fully anonymously — but wired here so it's a one-liner if you want it later.
 */
export function identify(id: string, traits?: Dict): void {
  if (!initialized) return;
  mixpanel.identify(id);
  if (traits) mixpanel.people.set(traits);
}

/** Re-export so callers get the same Dict type without importing mixpanel. */
export type { Dict };
