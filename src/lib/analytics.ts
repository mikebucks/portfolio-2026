"use client";

// Mixpanel transport. No token => silent no-op everywhere.
// The token is send-only, so shipping it client-side is fine.

import mixpanel, { type Dict } from "mixpanel-browser";
import { SITE } from "./siteMeta";

const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let initialized = false;

const PROD_HOST = new URL(SITE.url).hostname;

export function isProductionHost(host: string): boolean {
  return host === PROD_HOST || host === `www.${PROD_HOST}`;
}

/** Returns whether analytics is live. Idempotent. */
export function initAnalytics(): boolean {
  if (initialized) return true;
  if (!TOKEN || typeof window === "undefined") return false;

  // Hostname allowlist, not NODE_ENV: LAN IPs, tunnels, previews and a local
  // `next start` must not record.
  if (!isProductionHost(window.location.hostname)) return false;

  mixpanel.init(TOKEN, {
    // SPA pageviews are tracked by hand (appRoute.onRouteChange).
    track_pageview: false,
    persistence: "localStorage",
    debug: process.env.NODE_ENV !== "production",
    batch_requests: true,
    // Analytics.tsx does its own click capture; both on would double count.
    autocapture: false,
    // Session Replay. Inputs are masked by SDK default; add `mp-mask` to hide text.
    // record_canvas stays off: the shader background is decorative and costly.
    record_sessions_percent: 100,
    record_mask_text_selector: ".mp-mask",
  });

  mixpanel.register({
    site: SITE.name,
    app: "portfolio-2026",
    viewport_w: window.innerWidth,
    viewport_h: window.innerHeight,
  });

  initialized = true;
  return true;
}

export function track(event: string, props?: Dict): void {
  if (!initialized) return;
  mixpanel.track(event, props);
}
