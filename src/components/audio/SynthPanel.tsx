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
 * The synth panel. A row of themes picks the sound + visuals; each theme maps
 * 1:1 to a preset whose `baseSettings` are the whole voice. Per-parameter
 * controls will live here later; for now the sound is edited directly in the
 * preset.
 *
 * No chrome of its own — the seal in the header is the open/close control, and
 * the audio context unlocks on the first gesture anywhere (AudioProvider), so
 * neither a close button nor an "enable audio" prompt belongs in here.
 */
export function SynthPanel() {
  const open = useUIStore((s) => s.synthPanelOpen);
  const setOpen = useUIStore((s) => s.setSynthPanel);
  const theme = useThemeStore((s) => s.theme);

  const preset = THEME_PRESETS[theme];
  const panelRef = useRef<HTMLElement>(null);

  // The panel outlives `open` by one transition so it can slide back out:
  // `mounted` keeps it in the tree, `entered` is the class flip that drives the
  // slide in either direction. Unmount happens on the closing transitionend.
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  const enteredRef = useRef(false);
  // Whether the content cascade has played in and not yet out — see below.
  const shownRef = useRef(false);

  useEffect(() => {
    if (!open) {
      // Closed before the panel ever slid in (a double-click on the seal beats
      // the two frames below): nothing will transition, so no transitionend is
      // coming to unmount it. Drop it here instead.
      if (!enteredRef.current) setMounted(false);
      enteredRef.current = false;
      setEntered(false);
      return;
    }
    setMounted(true);
    // Two frames, not one: the first paints the panel in its off-screen state,
    // the second flips the class. Flipping in the same frame as the mount gives
    // the browser no start value to transition from, and the panel just appears.
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

  // The content cascade. The <aside> slides on CSS (below); its blocks —
  // theme picker, keys + piano roll, faders, blurb — fly up into place
  // top-to-bottom on the intro headline's timing (0.9s expo.out, 0.18s
  // stagger, 24px offset), the same vocabulary as the project modal, starting
  // once the slide is well under way. Closing runs the same cascade backwards
  // and faster, inside the slide-out, so the panel empties as it leaves.
  // Layout effect: the hidden start state must land before the first paint of
  // the entered panel, or the blocks flash at full opacity for a frame.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const blocks = panel.querySelectorAll<HTMLElement>("[data-panel-reveal]");
    if (prefersReducedMotion()) {
      gsap.set(blocks, { opacity: 1, y: 0 });
      return;
    }
    // Fresh mount: the blocks have never shown, so there is nothing to run
    // out — park them at the cascade's start state and wait for `entered`.
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
    // `mounted` is a dependency so the parking branch runs on the render that
    // first puts the panel (and its blocks) in the tree, not the one before.
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

  // Light-dismiss: a press anywhere outside closes the panel. No backdrop
  // element — one would have to cover the page to catch the press, and that
  // would swallow the clicks the header nav and the page below still accept.
  // The seal is exempt: it dismisses on its own, and letting this handler close
  // first would leave its toggle re-opening the panel on the following click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (target.closest("[data-synth-toggle]")) return;
      setOpen(false);
    };
    // Capture phase: handlers that stop propagation on their own presses
    // shouldn't be able to keep the panel open.
    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, setOpen]);

  if (!mounted) return null;

  // Portalled to <body>. The panel renders from inside the <header>, and the
  // header's backdrop-filter makes it the containing block for fixed-position
  // descendants — so `bottom` would resolve against the ~5rem-tall bar instead
  // of the viewport. `data-modal-hide` is carried over by hand so the panel
  // still fades out behind the project modal from its new home.
  //
  // Two elements, not one: [data-modal-hide] owns this element's transform and
  // transition (globals.css scales it away behind the project modal), so the
  // slide lives on the <aside> inside it rather than colliding there.
  // pointer-events-none keeps this empty box — which stays parked over the
  // right rail whether or not the panel is out — from eating clicks meant for
  // the page.
  return createPortal(
    <div
      data-modal-hide
      // Spans the height of the frame's inner opening: it starts below the
      // header bar (--header-h, published by Header) so the nav stays visible
      // and clickable, and stops on the cream frame's 10px rails — which the
      // safe-area insets extend on notched devices, matching layout.tsx.
      //
      // The bottom stops short of that rail to clear the toggle, which is the
      // panel's own close control and sits inside its width — overlap it and
      // the panel covers the thing you dismiss it with. Written as the toggle's
      // own inset (2.5rem, see SynthToggleButton) plus its 40px chip plus 16px
      // of air, rather than as the single number that sum comes to, because the
      // two have already drifted apart once: the toggle moved off the rail and
      // onto the footer's content column, and a hard-coded 72px silently became
      // an 8px overlap. Anchored this way it tracks.
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + var(--header-h, 5rem))",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 2.5rem + 56px)",
        right: "calc(env(safe-area-inset-right, 0px) + 10px)",
      }}
      // z-[105]: above a hovered featured card (z-101, which itself outranks
      // the cream frame bars at z-100) so the panel never gets painted over by
      // the card's promoted hover ring; below the scrolled header (z-110) and
      // the project modal (z-120). Same layer as the toggle chip (z-105) — the
      // two never overlap, the panel's bottom inset stops above it.
      className="pointer-events-none fixed z-[105] w-[min(400px,calc(100vw-2rem-60px))]"
    >
      <aside
        ref={panelRef}
        role="dialog"
        aria-label="Synth controls"
        // Suppresses the global :focus-visible ring inside the panel — see
        // globals.css. The panel's own lit states carry the feedback instead.
        data-focus-quiet
        // Closing is done when the slide is: unmount on the slide's end rather
        // than a timer, so the two can't drift apart. `translate`, not
        // `transform` — see the class list below. Guarded on the element itself,
        // since the theme buttons transition too and their events bubble here.
        onTransitionEnd={(e) => {
          if (!open && e.target === e.currentTarget && e.propertyName === "translate")
            setMounted(false);
        }}
        // Slides past its own right offset and shadow so nothing peeks off the
        // edge. Opacity trails along to soften the arrival at the rail.
        //
        // The transition names `translate`, not `transform`: Tailwind v4 builds
        // translate-x-* on the independent `translate` property, so a
        // transform transition here would list a property that never changes
        // and the panel would just pop in.
        className={`flex h-full flex-col m-2 rounded-lg bg-black/50 p-2 font-mono text-xs text-white shadow-2xl backdrop-blur-md transition-[translate,opacity] duration-[320ms] ease-[cubic-bezier(0.7,0,0.2,1)] ${
          entered
            ? "pointer-events-auto translate-x-0 opacity-100"
            : "pointer-events-none translate-x-[calc(100%+2rem)] opacity-0"
        }`}
      >
        {/* The panel is now viewport-tall, so the controls take the slack and
            scroll on their own — data-lenis-prevent keeps the smooth-scroll
            instance from stealing the wheel and scrolling the page instead. */}
        {/* [data-panel-reveal] marks the cascade's blocks, in reveal order. */}
        <div data-lenis-prevent className="flex flex-col gap-8 min-h-0 flex-1 overflow-y-auto">
          <div data-panel-reveal>
            <ThemePicker />
          </div>

          {/* The same caps the footer shows, at playing size — a mouse or a
              touch screen gets the whole mapping, not just the letters. */}
          <div data-panel-reveal className="flex flex-col gap-2">
            <SynthKeyCapRow />
            <PianoRoll />
          </div>

          {/* Player-owned mix faders, constant across presets. */}
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

  // "Chance" is a roll, not a theme, so it stays out of THEME_IDS: every
  // Record<ThemeId, …> behind it (THEME_PRESETS, THEMES, the shader lookup)
  // would otherwise need a member with no shader and no voice to give it.
  // It draws from the other six — rolling the theme already playing would
  // read as a dead button.
  const roll = () => {
    const others = THEME_IDS.filter((id) => id !== theme);
    setTheme(others[Math.floor(Math.random() * others.length)]);
  };

  // The same directional wipe as the header nav (nav-link), re-inked for the
  // dark glass: the fill sweeps in white and the label flips dark. Active is
  // the wipe at rest — hover and selection are one visual language.
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

      {/* Fills the eighth cell the seven principles leave open. Not a radio —
          it never holds the selection, it hands it to one of the others. */}
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
