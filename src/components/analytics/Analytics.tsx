"use client";

// Mount once at the root. Tracks page views and interactions with interactive
// elements only; ambient input (scroll, cursor) is left to Session Replay.
// Capture phase so stopPropagation can't hide an interaction.

import { useEffect } from "react";
import { initAnalytics, track } from "@/lib/analytics";
import { onRouteChange } from "@/lib/appRoute";

const MAX_STR = 120;

const EV = {
  pageView: "Page View",
  click: "Click",
  keyPress: "Key Press",
  formSubmit: "Form Submit",
  inputChange: "Input Change",
} as const;

// `[data-track]` opts a custom control in; tabindex=-1 is script-only focus.
const INTERACTIVE_SELECTOR =
  "a[href], button, [role='button'], [role='link'], [role='menuitem'], " +
  "input, select, textarea, summary, label, [data-track], " +
  "[tabindex]:not([tabindex='-1'])";

function interactiveTarget(raw: EventTarget | null): HTMLElement | null {
  if (!(raw instanceof Element)) return null;
  const el = raw.closest(INTERACTIVE_SELECTOR);
  return el instanceof HTMLElement ? el : null;
}

function truncate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return undefined;
  return trimmed.length > MAX_STR ? trimmed.slice(0, MAX_STR) + "…" : trimmed;
}

/** e.g. `main > section#about > a.link` */
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

/** Identity only, never input values. */
function describeElement(el: HTMLElement): Record<string, unknown> {
  const anchor = el.closest("a") as HTMLAnchorElement | null;
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || undefined,
    classes: truncate(typeof el.className === "string" ? el.className : undefined),
    text: truncate(el.textContent),
    role: el.getAttribute("role") || undefined,
    aria_label: truncate(el.getAttribute("aria-label")),
    track_id: el.getAttribute("data-track") || undefined,
    href: anchor?.href || undefined,
    external: anchor ? anchor.host !== window.location.host : undefined,
    name: (el as HTMLInputElement).name || undefined,
    input_type: el.tagName === "INPUT" ? (el as HTMLInputElement).type : undefined,
    selector: selectorPath(el),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pointerProps(e: MouseEvent): Record<string, unknown> {
  return {
    x: Math.round(e.clientX),
    y: Math.round(e.clientY),
    // 0–1, viewport-independent
    xr: round2(e.clientX / window.innerWidth),
    yr: round2(e.clientY / window.innerHeight),
    path: window.location.pathname,
  };
}

export function Analytics() {
  useEffect(() => {
    if (!initAnalytics()) return;

    const trackPageView = () =>
      track(EV.pageView, {
        path: window.location.pathname,
        search: window.location.search || undefined,
        hash: window.location.hash || undefined,
        referrer: document.referrer || undefined,
        title: document.title,
      });

    trackPageView();
    const stopRouteWatch = onRouteChange(trackPageView);

    const onClick = (e: MouseEvent) => {
      const el = interactiveTarget(e.target);
      if (!el) return;
      track(EV.click, { ...pointerProps(e), ...describeElement(el) });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Never log typed characters (contact form).
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

    const onSubmit = (e: SubmitEvent) => {
      if (e.target instanceof HTMLElement) track(EV.formSubmit, describeElement(e.target));
    };

    const onChange = (e: Event) => {
      // Never the value entered.
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
        checked: el instanceof HTMLInputElement && el.type === "checkbox" ? el.checked : undefined,
        filled: el.value.length > 0,
      });
    };

    const opts = { capture: true, passive: true } as const;
    document.addEventListener("click", onClick, opts);
    document.addEventListener("keydown", onKeyDown, opts);
    document.addEventListener("submit", onSubmit, opts);
    document.addEventListener("change", onChange, opts);

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
