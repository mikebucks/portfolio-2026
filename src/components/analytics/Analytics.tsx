"use client";

/**
 * Global analytics wiring — mount once, near the root of the tree.
 *
 * Renders nothing. On mount it boots Mixpanel (via lib/analytics) and attaches
 * a single set of document/window listeners that capture, in order of volume:
 *
 *   1. Page views      — initial load + every History-API route change.
 *   2. Discrete input  — clicks, double-clicks, right-clicks, mousedown/up,
 *                        key presses, form submits, copy, visibility changes.
 *   3. Scroll          — SAMPLED and BATCHED into one event per stretch (see
 *                        SCROLL_* constants), for scroll-depth reporting.
 *
 * Continuous cursor movement is intentionally NOT tracked as events anymore —
 * Mixpanel Session Replay (configured in lib/analytics) captures the full
 * cursor path, DOM and scroll as a replayable video instead, which is both
 * richer and far cheaper than one event per sample.
 *
 * All listeners use the capture phase so nothing the app does (stopPropagation
 * on a button, say) can hide an interaction from tracking. When the token is
 * absent, `initAnalytics()` returns false and we attach nothing at all.
 */

import { useEffect } from "react";
import { initAnalytics, track } from "@/lib/analytics";
import { onRouteChange } from "@/lib/appRoute";

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------

/** Minimum gap between recorded scroll samples (ms). */
const SCROLL_SAMPLE_MS = 200;
/** Flush the scroll buffer at this many samples… */
const SCROLL_FLUSH_COUNT = 40;
/** …or on this timer, whichever comes first (keeps short bursts from lingering). */
const SCROLL_FLUSH_MS = 5000;

/** Text/attribute values are truncated to this many chars before sending. */
const MAX_STR = 120;

// ---------------------------------------------------------------------------
// Event names — one catalogue so the Mixpanel report reads consistently.
// ---------------------------------------------------------------------------

const EV = {
  pageView: "Page View",
  click: "Click",
  auxClick: "Aux Click", // middle button
  contextMenu: "Context Menu", // right click
  doubleClick: "Double Click",
  mouseDown: "Mouse Down",
  mouseUp: "Mouse Up",
  scroll: "Scroll", // batched
  keyPress: "Key Press",
  formSubmit: "Form Submit",
  inputChange: "Input Change",
  copy: "Copy",
  visibility: "Visibility Change",
  pageLeave: "Page Leave",
} as const;

// ---------------------------------------------------------------------------
// Element description — turn a DOM node into readable, queryable props.
// ---------------------------------------------------------------------------

function truncate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return undefined;
  return trimmed.length > MAX_STR ? trimmed.slice(0, MAX_STR) + "…" : trimmed;
}

/** A short, human-readable CSS-ish path like `main > section#about > a.link`. */
function selectorPath(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  let depth = 0;
  while (node && depth < 4) {
    let part = node.tagName.toLowerCase();
    if (node.id) part += `#${node.id}`;
    else if (typeof node.className === "string" && node.className.trim()) {
      part += "." + node.className.trim().split(/\s+/).slice(0, 2).join(".");
    }
    parts.unshift(part);
    node = node.parentElement;
    depth += 1;
  }
  return parts.join(" > ");
}

/**
 * Describe the element an interaction landed on. Walks up to the nearest
 * meaningful target (a link/button/[data-track] wrapping the exact node), so a
 * click on the <span> inside a <button> is reported as the button.
 */
function describeTarget(raw: EventTarget | null): Record<string, unknown> {
  if (!(raw instanceof Element)) return { target_kind: "non-element" };

  // Prefer the closest actionable ancestor — that's what the user meant to hit.
  const actionable =
    raw.closest("a, button, [role='button'], [data-track], input, select, textarea, summary") ??
    raw;
  const el = actionable as HTMLElement;

  const anchor = el.closest("a") as HTMLAnchorElement | null;

  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || undefined,
    classes: truncate(typeof el.className === "string" ? el.className : undefined),
    text: truncate(el.textContent),
    role: el.getAttribute("role") || undefined,
    aria_label: truncate(el.getAttribute("aria-label")),
    // A `data-track="…"` anywhere in the app becomes a clean, stable event
    // label without editing this file — the escape hatch for naming things.
    track_id: el.getAttribute("data-track") || undefined,
    href: anchor?.href || undefined,
    // Off-site links are worth splitting out in reports.
    external: anchor ? anchor.host !== window.location.host : undefined,
    name: (el as HTMLInputElement).name || undefined,
    input_type: el.tagName === "INPUT" ? (el as HTMLInputElement).type : undefined,
    selector: selectorPath(el),
  };
}

/** Common props on every event: where the pointer was + where we are. */
function pointerProps(e: MouseEvent): Record<string, unknown> {
  return {
    x: Math.round(e.clientX),
    y: Math.round(e.clientY),
    // Normalised 0–1 so heatmaps survive different viewport sizes.
    xr: round2(e.clientX / window.innerWidth),
    yr: round2(e.clientY / window.innerHeight),
    path: window.location.pathname,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Analytics() {
  useEffect(() => {
    // No token → initAnalytics returns false → we wire up nothing and leave.
    if (!initAnalytics()) return;

    const pageEnteredAt = Date.now();

    // --- 1. Page views -----------------------------------------------------

    const trackPageView = () =>
      track(EV.pageView, {
        path: window.location.pathname,
        hash: window.location.hash || undefined,
        referrer: document.referrer || undefined,
        title: document.title,
      });

    trackPageView(); // first load
    const stopRouteWatch = onRouteChange(trackPageView); // SPA navigations

    // --- 2. Discrete pointer & input events --------------------------------

    const onClick = (e: MouseEvent) =>
      track(EV.click, { ...pointerProps(e), ...describeTarget(e.target), button: e.button });
    const onAuxClick = (e: MouseEvent) =>
      track(EV.auxClick, { ...pointerProps(e), ...describeTarget(e.target), button: e.button });
    const onContextMenu = (e: MouseEvent) =>
      track(EV.contextMenu, { ...pointerProps(e), ...describeTarget(e.target) });
    const onDblClick = (e: MouseEvent) =>
      track(EV.doubleClick, { ...pointerProps(e), ...describeTarget(e.target) });
    const onMouseDown = (e: MouseEvent) =>
      track(EV.mouseDown, { ...pointerProps(e), ...describeTarget(e.target), button: e.button });
    const onMouseUp = (e: MouseEvent) =>
      track(EV.mouseUp, { ...pointerProps(e), ...describeTarget(e.target), button: e.button });

    const onKeyDown = (e: KeyboardEvent) => {
      // Never log the character typed — only which control key, and where.
      // Capturing key *content* would record anything entered in the contact
      // form (a privacy problem and, for the message field, useless noise).
      track(EV.keyPress, {
        key: e.metaKey || e.ctrlKey || e.altKey || e.key.length > 1 ? e.key : "(char)",
        meta: e.metaKey || undefined,
        ctrl: e.ctrlKey || undefined,
        alt: e.altKey || undefined,
        shift: e.shiftKey || undefined,
        ...describeTarget(e.target),
      });
    };

    const onSubmit = (e: SubmitEvent) =>
      track(EV.formSubmit, describeTarget(e.target));

    const onChange = (e: Event) => {
      // Field was edited — record THAT it changed and its identity, never the
      // value entered (same privacy line as keydown above).
      const el = e.target;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement))
        return;
      track(EV.inputChange, {
        ...describeTarget(el),
        // Checkboxes/radios/selects have non-sensitive, useful state.
        checked: el instanceof HTMLInputElement && el.type === "checkbox" ? el.checked : undefined,
        filled: el.value.length > 0,
      });
    };

    const onCopy = () => {
      const selection = window.getSelection()?.toString() ?? "";
      track(EV.copy, { chars: selection.length, sample: truncate(selection) });
    };

    const onVisibility = () =>
      track(EV.visibility, { state: document.visibilityState });

    // --- 3. Scroll depth, sampled and batched ------------------------------
    // (Cursor movement is captured by Session Replay, not as events — see the
    // file header.)

    // Scroll buffer. Depth is normalised so it's comparable across page heights.
    let scrollBuf: Array<[number, number]> = [];
    let lastScrollSample = 0;

    const flushScroll = () => {
      if (scrollBuf.length === 0) return;
      track(EV.scroll, {
        path: window.location.pathname,
        count: scrollBuf.length,
        // [depth 0–1, dt] pairs.
        points: scrollBuf,
        max_depth: Math.max(...scrollBuf.map(([d]) => d)),
      });
      scrollBuf = [];
    };

    const onScroll = () => {
      const now = Date.now();
      if (now - lastScrollSample < SCROLL_SAMPLE_MS) return;
      lastScrollSample = now;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const depth = max > 0 ? round2(window.scrollY / max) : 0;
      scrollBuf.push([depth, now - pageEnteredAt]);
      if (scrollBuf.length >= SCROLL_FLUSH_COUNT) flushScroll();
    };

    // Time-based flush so a visitor who scrolls a little then stops still gets
    // their buffer sent, and so buffers don't cross a page-leave boundary.
    const flushTimer = window.setInterval(flushScroll, SCROLL_FLUSH_MS);

    // Final flush + session length on the way out. `pagehide` is more reliable
    // than `beforeunload` on mobile Safari; both are harmless if double-fired.
    const onPageLeave = () => {
      flushScroll();
      track(EV.pageLeave, {
        path: window.location.pathname,
        seconds_on_page: Math.round((Date.now() - pageEnteredAt) / 1000),
      });
    };

    // --- Attach (capture phase for everything) -----------------------------

    const opts = { capture: true, passive: true } as const;
    document.addEventListener("click", onClick, opts);
    document.addEventListener("auxclick", onAuxClick, opts);
    document.addEventListener("contextmenu", onContextMenu, opts);
    document.addEventListener("dblclick", onDblClick, opts);
    document.addEventListener("mousedown", onMouseDown, opts);
    document.addEventListener("mouseup", onMouseUp, opts);
    document.addEventListener("keydown", onKeyDown, opts);
    document.addEventListener("submit", onSubmit, opts);
    document.addEventListener("change", onChange, opts);
    document.addEventListener("copy", onCopy, opts);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onScroll, opts);
    window.addEventListener("pagehide", onPageLeave);

    // --- Cleanup -----------------------------------------------------------

    return () => {
      stopRouteWatch();
      window.clearInterval(flushTimer);
      flushScroll();
      document.removeEventListener("click", onClick, opts);
      document.removeEventListener("auxclick", onAuxClick, opts);
      document.removeEventListener("contextmenu", onContextMenu, opts);
      document.removeEventListener("dblclick", onDblClick, opts);
      document.removeEventListener("mousedown", onMouseDown, opts);
      document.removeEventListener("mouseup", onMouseUp, opts);
      document.removeEventListener("keydown", onKeyDown, opts);
      document.removeEventListener("submit", onSubmit, opts);
      document.removeEventListener("change", onChange, opts);
      document.removeEventListener("copy", onCopy, opts);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll, opts);
      window.removeEventListener("pagehide", onPageLeave);
    };
  }, []);

  return null;
}
