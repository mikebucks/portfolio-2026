"use client";

/**
 * Global analytics wiring — mount once, near the root of the tree.
 *
 * Renders nothing. On mount it boots Mixpanel (via lib/analytics) and attaches
 * a deliberately small set of document listeners. The rule: an event only
 * exists when it's an INTENTIONAL interaction with an INTERACTIVE element —
 * a link, a button, a form control. Clicking the WebGL background, the cream
 * frame, or a paragraph of copy produces nothing.
 *
 * What we capture:
 *   • Page View    — initial load + every History-API route change.
 *   • Click        — only when the target resolves to an interactive element
 *                    (see INTERACTIVE_SELECTOR). Background/chrome clicks are
 *                    dropped.
 *   • Key Press    — which control keys, where (never the characters typed).
 *   • Form Submit / Input Change — on the interactive form controls themselves.
 *
 * Everything continuous or ambient — cursor path, scroll, mouse up/down, page
 * visibility — is intentionally NOT tracked as events. Mixpanel Session Replay
 * (configured in lib/analytics) records the full session as video, which is
 * where that fidelity lives now.
 *
 * All listeners use the capture phase so nothing the app does (stopPropagation
 * on a button, say) can hide an interaction from tracking. When the token is
 * absent (or we're on any host other than the live site), `initAnalytics()`
 * returns false and we attach nothing at all.
 */

import { useEffect } from "react";
import { initAnalytics, track } from "@/lib/analytics";
import { onRouteChange } from "@/lib/appRoute";

/** Text/attribute values are truncated to this many chars before sending. */
const MAX_STR = 120;

// ---------------------------------------------------------------------------
// Event names — one catalogue so the Mixpanel report reads consistently.
// ---------------------------------------------------------------------------

const EV = {
  pageView: "Page View",
  click: "Click",
  keyPress: "Key Press",
  formSubmit: "Form Submit",
  inputChange: "Input Change",
} as const;

// ---------------------------------------------------------------------------
// What counts as "interactive".
// ---------------------------------------------------------------------------

/**
 * A click is only tracked if it lands on — or inside — an element matching this.
 * `[data-track]` is the escape hatch: put it on any custom control that isn't a
 * native button/link and it becomes trackable (and gets a clean label). Adding
 * `tabindex="-1"` is excluded because that's the "focusable by script, not by
 * the user" marker — not a real interactive target.
 */
const INTERACTIVE_SELECTOR =
  "a[href], button, [role='button'], [role='link'], [role='menuitem'], " +
  "input, select, textarea, summary, label, [data-track], " +
  "[tabindex]:not([tabindex='-1'])";

/**
 * The interactive element an event landed on, or null if it hit something
 * non-interactive (the shader background, the cream frame, plain body copy).
 * A click on the <span> inside a <button> resolves to the button.
 */
function interactiveTarget(raw: EventTarget | null): HTMLElement | null {
  if (!(raw instanceof Element)) return null;
  const el = raw.closest(INTERACTIVE_SELECTOR);
  return el instanceof HTMLElement ? el : null;
}

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

/** Describe a known element (identity only — never input values). */
function describeElement(el: HTMLElement): Record<string, unknown> {
  const anchor = el.closest("a") as HTMLAnchorElement | null;
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || undefined,
    classes: truncate(typeof el.className === "string" ? el.className : undefined),
    text: truncate(el.textContent),
    role: el.getAttribute("role") || undefined,
    aria_label: truncate(el.getAttribute("aria-label")),
    // A `data-track="…"` becomes a clean, stable event label without editing
    // this file — the escape hatch for naming custom controls.
    track_id: el.getAttribute("data-track") || undefined,
    href: anchor?.href || undefined,
    // Off-site links are worth splitting out in reports.
    external: anchor ? anchor.host !== window.location.host : undefined,
    name: (el as HTMLInputElement).name || undefined,
    input_type: el.tagName === "INPUT" ? (el as HTMLInputElement).type : undefined,
    selector: selectorPath(el),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Where the pointer was + where we are, added to click events. */
function pointerProps(e: MouseEvent): Record<string, unknown> {
  return {
    x: Math.round(e.clientX),
    y: Math.round(e.clientY),
    // Normalised 0–1 so reports survive different viewport sizes.
    xr: round2(e.clientX / window.innerWidth),
    yr: round2(e.clientY / window.innerHeight),
    path: window.location.pathname,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Analytics() {
  useEffect(() => {
    // No token / not the live site → initAnalytics returns false → wire up nothing.
    if (!initAnalytics()) return;

    // --- Page views --------------------------------------------------------

    const trackPageView = () =>
      track(EV.pageView, {
        path: window.location.pathname,
        hash: window.location.hash || undefined,
        referrer: document.referrer || undefined,
        title: document.title,
      });

    trackPageView(); // first load
    const stopRouteWatch = onRouteChange(trackPageView); // SPA navigations

    // --- Click, scoped to interactive elements -----------------------------

    const onClick = (e: MouseEvent) => {
      const el = interactiveTarget(e.target);
      if (!el) return; // background / chrome / plain text → no event
      track(EV.click, { ...pointerProps(e), ...describeElement(el) });
    };

    // --- Key press ---------------------------------------------------------

    const onKeyDown = (e: KeyboardEvent) => {
      // Never log the character typed — only which control key, and (when it's
      // an interactive element) where. Capturing key *content* would record
      // anything entered in the contact form.
      const el = interactiveTarget(e.target);
      track(EV.keyPress, {
        key: e.metaKey || e.ctrlKey || e.altKey || e.key.length > 1 ? e.key : "(char)",
        meta: e.metaKey || undefined,
        ctrl: e.ctrlKey || undefined,
        alt: e.altKey || undefined,
        shift: e.shiftKey || undefined,
        ...(el ? describeElement(el) : {}),
      });
    };

    // --- Form controls (interactive by definition) -------------------------

    const onSubmit = (e: SubmitEvent) => {
      if (e.target instanceof HTMLElement) track(EV.formSubmit, describeElement(e.target));
    };

    const onChange = (e: Event) => {
      // Field was edited — record THAT it changed and its identity, never the
      // value entered (same privacy line as keydown above).
      const el = e.target;
      if (
        !(
          el instanceof HTMLInputElement ||
          el instanceof HTMLSelectElement ||
          el instanceof HTMLTextAreaElement
        )
      )
        return;
      track(EV.inputChange, {
        ...describeElement(el),
        // Checkboxes/radios have non-sensitive, useful state.
        checked: el instanceof HTMLInputElement && el.type === "checkbox" ? el.checked : undefined,
        filled: el.value.length > 0,
      });
    };

    // --- Attach (capture phase for everything) -----------------------------

    const opts = { capture: true, passive: true } as const;
    document.addEventListener("click", onClick, opts);
    document.addEventListener("keydown", onKeyDown, opts);
    document.addEventListener("submit", onSubmit, opts);
    document.addEventListener("change", onChange, opts);

    // --- Cleanup -----------------------------------------------------------

    return () => {
      stopRouteWatch();
      document.removeEventListener("click", onClick, opts);
      document.removeEventListener("keydown", onKeyDown, opts);
      document.removeEventListener("submit", onSubmit, opts);
      document.removeEventListener("change", onChange, opts);
    };
  }, []);

  return null;
}
