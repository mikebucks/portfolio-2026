"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/device";
import { useThemeStore, useUIStore } from "@/lib/store";
import { PianoRoll } from "./PianoRoll";
import { SynthKeyCapRow } from "./SynthKeyCap";
import { SynthSliders } from "./SynthSliders";
import {
  THEME_IDS,
  THEME_PRESETS,
  type ThemeId,
} from "@/components/webgl/materials/shaders/themes";

/**
 * The synth panel: theme row, keys, faders. No chrome of its own — the seal
 * toggles it and audio unlocks on the first gesture anywhere (AudioProvider).
 */
export function SynthPanel() {
  const open = useUIStore((s) => s.synthPanelOpen);
  const setOpen = useUIStore((s) => s.setSynthPanel);
  const theme = useThemeStore((s) => s.theme);

  const preset = THEME_PRESETS[theme];
  const panelRef = useRef<HTMLElement>(null);

  // Outlives `open` by one transition so it can slide out; unmounts on the
  // closing transitionend.
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  const enteredRef = useRef(false);
  // Content cascade played in and not yet out.
  const shownRef = useRef(false);

  useEffect(() => {
    if (!open) {
      // Closed before it slid in: no transitionend coming, unmount here.
      if (!enteredRef.current) setMounted(false);
      enteredRef.current = false;
      setEntered(false);
      return;
    }
    setMounted(true);
    // Two frames: the first paints the off-screen state, or there is nothing
    // to transition from.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        enteredRef.current = true;
        setEntered(true);
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [open]);

  // Content cascade, same vocabulary as the project modal. Layout effect: the
  // hidden start state must land before first paint or the blocks flash.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const blocks = panel.querySelectorAll<HTMLElement>("[data-panel-reveal]");
    if (prefersReducedMotion()) {
      gsap.set(blocks, { opacity: 1, y: 0 });
      return;
    }
    // Fresh mount: park at the start state and wait for `entered`.
    if (!entered && !shownRef.current) {
      gsap.set(blocks, { opacity: 0, y: 24 });
      return;
    }
    shownRef.current = entered;
    const tween = entered
      ? gsap.fromTo(
          blocks,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "expo.out",
            delay: 0.12,
            stagger: 0.18,
            force3D: true,
            overwrite: true,
          },
        )
      : gsap.to(blocks, {
          opacity: 0,
          y: 12,
          duration: 0.22,
          ease: "power2.in",
          stagger: { each: 0.04, from: "end" },
          force3D: true,
          overwrite: true,
        });
    return () => {
      tween.kill();
    };
    // `mounted` dep: the parking branch must run on the render that adds the blocks.
  }, [mounted, entered]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // Light-dismiss without a backdrop (one would swallow header nav clicks).
  // The seal is exempt: it toggles itself.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (target.closest("[data-synth-toggle]")) return;
      setOpen(false);
    };
    // Capture phase, so stopPropagation elsewhere can't keep it open.
    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, setOpen]);

  if (!mounted) return null;

  // Portalled: the header's backdrop-filter would trap fixed children.
  // Two elements: [data-modal-hide] owns this one's transform (globals.css),
  // so the slide lives on the <aside>. pointer-events-none: the box is always
  // parked over the right rail.
  return createPortal(
    <div
      data-modal-hide
      // Top: below the header bar. Bottom: clears the toggle, written as its
      // 2.5rem inset + 40px chip + 16px air so the two can't drift.
      // Right: the frame rail, or the 1600px column's edge once wider (minus
      // the card's 0.5rem margin). `100%` excludes the scrollbar; `100vw` doesn't.
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + var(--header-h, 5rem))",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 2.5rem + 56px)",
        right:
          "max(calc(env(safe-area-inset-right, 0px) + 10px), calc((100% - 1600px) / 2 - 0.5rem))",
      }}
      // z-105: above hovered project cards (101), below the scrolled header
      // (110) and project modal (120).
      className="pointer-events-none fixed z-[105] w-[min(473px,calc(100vw-2rem-60px))]"
    >
      <aside
        ref={panelRef}
        role="dialog"
        aria-label="Synth controls"
        // Suppresses the global :focus-visible ring (globals.css); lit states
        // carry the feedback.
        data-focus-quiet
        // Unmount on the slide's end, not a timer. Guarded on the element:
        // the theme buttons' transitions bubble here.
        onTransitionEnd={(e) => {
          if (!open && e.target === e.currentTarget && e.propertyName === "translate")
            setMounted(false);
        }}
        // `translate`, not `transform`: Tailwind v4 puts translate-x-* on the
        // independent property, so a transform transition would never fire.
        className={`flex h-full flex-col m-2 rounded-lg bg-black/50 p-2 font-mono text-xs text-white shadow-2xl backdrop-blur-md transition-[translate,opacity] duration-[320ms] ease-[cubic-bezier(0.7,0,0.2,1)] ${
          entered
            ? "pointer-events-auto translate-x-0 opacity-100"
            : "pointer-events-none translate-x-[calc(100%+2rem)] opacity-0"
        }`}
      >
        {/* data-lenis-prevent: smooth-scroll must not steal the wheel.
            [data-panel-reveal] marks the cascade's blocks, in order. */}
        <div data-lenis-prevent className="flex flex-col gap-8 min-h-0 flex-1 overflow-y-auto">
          <div data-panel-reveal>
            <ThemePicker />
          </div>

          <div data-panel-reveal className="flex flex-col gap-2">
            <SynthKeyCapRow />
            <PianoRoll />
          </div>

          <div data-panel-reveal>
            <SynthSliders />
          </div>
        </div>

        <footer
          data-panel-reveal
          className="mt-4 shrink-0 text-xs leading-snug text-white/60"
        >
          {preset.blurb}
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

// ── Theme picker ───────────────────────────────────────────────────────────

function ThemePicker() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  // Chance stays out of THEME_IDS: every Record<ThemeId> would need a member
  // with no shader or voice. Draws from the others so it never reads as dead.
  const roll = () => {
    const others = THEME_IDS.filter((id) => id !== theme);
    setTheme(others[Math.floor(Math.random() * others.length)]);
  };

  // Header nav's wipe (nav-link), re-inked for the dark glass.
  const linkClass =
    "nav-link [--nav-link-fill:#fff] [--nav-link-ink:#161616] text-center text-xs uppercase tracking-wider text-white/75 cursor-pointer";

  return (
    <div
      role="radiogroup"
      aria-label="Principle"
      className="grid grid-cols-2 gap-1"
    >
      {THEME_IDS.map((id) => {
        const active = id === theme;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(id as ThemeId)}
            className={`${linkClass} ${active ? "is-active" : ""}`}
            title={THEME_PRESETS[id].blurb}
          >
            {THEME_PRESETS[id].label}
          </button>
        );
      })}

      {/* Not a radio: it hands the selection to another. */}
      <button
        type="button"
        onClick={roll}
        title="Pick a principle at random"
        className={linkClass}
      >
        Chance
      </button>
    </div>
  );
}
