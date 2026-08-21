"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { GRAPHIC_LABEL } from "./shared";

/**
 * Animated replacement for the static chisel-workflow.png. A swimlane graph —
 * CLAUDE, GITHUB and VERCEL lanes with the run of one Chisel change: prompt →
 * branch & edit → push → CI + preview build → report back, then either out to
 * eng review or looping back to the next prompt.
 *
 * Instead of arrows, the whole workflow is narrated by a relay: one dot
 * travels the graph hop by hop on a shared clock (each link owns a time slot
 * of the cycle), splitting where the workflow splits — at CI checks it forks
 * to the preview build and the report, and at report back one dot exits to
 * review while another rides the big loop back to the prompt. Steps carry
 * their sequence number so the relay can be read at a glance.
 *
 * ≥ md it's the original's swimlane layout with the loop arching over the
 * top; below md the steps stack as a single ordered column (lane shown as a
 * chip on each card) and the loop runs up the left margin.
 *
 * Like ChiselStack, connector geometry is measured from the rendered cards
 * (ResizeObserver) and the dots animate via SMIL — no per-frame JS.
 */

type Side = "left" | "right" | "top" | "bottom";

type Step = {
  id: string;
  /** Position in the sequence, shown on the card. */
  num?: number;
  title: string;
  sub: string[];
  /** Swimlane (desktop row): 0 = Claude, 1 = GitHub, 2 = Vercel. */
  lane: 0 | 1 | 2;
  /** Desktop grid column, 1-based. */
  col: number;
  dark?: boolean;
};

const LANES = ["Claude", "GitHub", "Vercel"] as const;

const STEPS: Step[] = [
  {
    id: "prompt",
    num: 1,
    title: "Prompt",
    sub: ['/chisel "make settings panel"'],
    lane: 0,
    col: 1,
  },
  {
    id: "branch",
    num: 2,
    title: "Branch & edit",
    sub: ["git checkout -b chisel/settings", "edit src/settings/*.tsx"],
    lane: 0,
    col: 2,
  },
  {
    id: "push",
    num: 3,
    title: "Push",
    sub: ["git push origin chisel/settings"],
    lane: 1,
    col: 2,
  },
  {
    id: "ci",
    num: 4,
    title: "CI checks",
    sub: ["Build, Lint, e2e"],
    lane: 1,
    col: 3,
  },
  {
    id: "preview",
    num: 5,
    title: "Preview build",
    sub: ["Webhook → Vercel build", "chisel-settings.vercel.app"],
    lane: 2,
    col: 3,
  },
  {
    id: "report",
    num: 6,
    title: "Report back",
    sub: ["CI clear, Preview ready"],
    lane: 0,
    col: 4,
  },
  {
    id: "ready",
    num: 7,
    title: "Ready for eng review",
    sub: ["PR flagged for human review"],
    lane: 1,
    col: 5,
    dark: true,
  },
];

type Link = {
  from: string;
  fromSide: Side;
  to: string;
  toSide: Side;
  /** Which slice of the relay cycle this hop's dot occupies (0-based). */
  slot: number;
  /** Nudge the anchor along the edge, so merging links don't stack. */
  toDx?: number;
  /** Override the curve's control-point reach (the loop needs a tall arch). */
  ext?: number;
};

const DESKTOP_LINKS: Link[] = [
  { from: "prompt", fromSide: "right", to: "branch", toSide: "left", slot: 0 },
  { from: "branch", fromSide: "bottom", to: "push", toSide: "top", slot: 1 },
  { from: "push", fromSide: "right", to: "ci", toSide: "left", slot: 2 },
  { from: "ci", fromSide: "bottom", to: "preview", toSide: "top", slot: 3 },
  // The fork: CI reports directly while the preview build spins up…
  { from: "ci", fromSide: "right", to: "report", toSide: "bottom", slot: 3, toDx: -12 },
  { from: "preview", fromSide: "right", to: "report", toSide: "bottom", slot: 4, toDx: 12 },
  // …and the exit + iterate loop leave report back together.
  { from: "report", fromSide: "right", to: "ready", toSide: "left", slot: 5 },
  { from: "report", fromSide: "top", to: "prompt", toSide: "top", slot: 5, ext: 38 },
];

const MOBILE_LINKS: Link[] = [
  { from: "prompt", fromSide: "bottom", to: "branch", toSide: "top", slot: 0 },
  { from: "branch", fromSide: "bottom", to: "push", toSide: "top", slot: 1 },
  { from: "push", fromSide: "bottom", to: "ci", toSide: "top", slot: 2 },
  { from: "ci", fromSide: "bottom", to: "preview", toSide: "top", slot: 3 },
  { from: "preview", fromSide: "bottom", to: "report", toSide: "top", slot: 4 },
  { from: "report", fromSide: "bottom", to: "ready", toSide: "top", slot: 5 },
  { from: "report", fromSide: "left", to: "prompt", toSide: "left", slot: 5, ext: 22 },
];

const SLOTS = 6;
/** Dot speed in px/s — every hop's duration is its path length over this, so
 *  short gaps flick across while the big loop takes visibly longer. */
const DOT_SPEED = 260;
/** Floor so the shortest gap hop is still perceptible. */
const MIN_HOP_SEC = 0.3;
/** Beat of stillness at the end of each cycle before the relay restarts. */
const REST_SEC = 0.5;

function anchor(r: DOMRect, side: Side, base: DOMRect, dx = 0): [number, number] {
  const x = r.left - base.left;
  const y = r.top - base.top;
  switch (side) {
    case "left":
      return [x, y + r.height / 2];
    case "right":
      return [x + r.width, y + r.height / 2];
    case "top":
      return [x + r.width / 2 + dx, y];
    case "bottom":
      return [x + r.width / 2 + dx, y + r.height];
  }
}

/**
 * Renders a polyline as straight orthogonal segments whose corners are
 * rounded with small quadratic arcs — the original graphic's 90°-bend style.
 * The radius shrinks when a segment is too short to fit it.
 */
function roundedPath(pts: [number, number][], radius = 10): string {
  const r = (n: number) => Math.round(n * 10) / 10;
  let d = `M ${r(pts[0][0])} ${r(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const inLen = Math.hypot(cx - px, cy - py);
    const outLen = Math.hypot(nx - cx, ny - cy);
    const rad = Math.min(radius, inLen / 2, outLen / 2);
    const inX = cx - ((cx - px) / inLen) * rad;
    const inY = cy - ((cy - py) / inLen) * rad;
    const outX = cx + ((nx - cx) / outLen) * rad;
    const outY = cy + ((ny - cy) / outLen) * rad;
    d += ` L ${r(inX)} ${r(inY)} Q ${r(cx)} ${r(cy)} ${r(outX)} ${r(outY)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L ${r(last[0])} ${r(last[1])}`;
}

/**
 * Routes a link as an orthogonal run between two card edges. Aligned anchors
 * connect straight; offset ones bend at 90° — an S through the midpoint of
 * the gap for edge-to-facing-edge links, a single elbow into a perpendicular
 * edge, and a three-sided detour for the loops, whose `ext` says how far the
 * detour lane sits from the start edge.
 */
function routePath(
  from: [number, number],
  fromSide: Side,
  to: [number, number],
  toSide: Side,
  ext?: number,
): string {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const key = `${fromSide}-${toSide}`;
  let pts: [number, number][];
  switch (key) {
    case "right-left":
      pts =
        Math.abs(y1 - y2) < 1
          ? [from, to]
          : [from, [(x1 + x2) / 2, y1], [(x1 + x2) / 2, y2], to];
      break;
    case "bottom-top":
      pts =
        Math.abs(x1 - x2) < 1
          ? [from, to]
          : [from, [x1, (y1 + y2) / 2], [x2, (y1 + y2) / 2], to];
      break;
    case "right-bottom":
      pts = [from, [x2, y1], to];
      break;
    case "top-top":
      pts = [from, [x1, y1 - (ext ?? 40)], [x2, y1 - (ext ?? 40)], to];
      break;
    case "left-left":
      pts = [from, [x1 - (ext ?? 24), y1], [x1 - (ext ?? 24), y2], to];
      break;
    default:
      pts = [from, to];
  }
  return roundedPath(pts);
}

type NetPath = { d: string; t0: number; t1: number };

type Net = {
  view: "desktop" | "mobile";
  w: number;
  h: number;
  /** Seconds per full relay cycle — the sum of the slot durations plus rest. */
  cycle: number;
  paths: NetPath[];
};

function RelayDot({ path, cycle }: { path: NetPath; cycle: number }) {
  const { d, t0, t1 } = path;
  const fade = (t1 - t0) * 0.25;
  const f = (n: number) => n.toFixed(4);
  return (
    <circle r="3" fill="var(--color-accent)" opacity="0" className="chisel-fan-dot">
      <animateMotion
        dur={`${cycle}s`}
        begin="0s"
        repeatCount="indefinite"
        calcMode="linear"
        keyPoints="0;0;1;1"
        keyTimes={`0;${f(t0)};${f(t1)};1`}
        path={d}
      />
      <animate
        attributeName="opacity"
        values="0;0;1;1;0;0"
        keyTimes={`0;${f(t0)};${f(t0 + fade)};${f(t1 - fade)};${f(t1)};1`}
        dur={`${cycle}s`}
        begin="0s"
        repeatCount="indefinite"
      />
    </circle>
  );
}

function FlowSvg({ net, view }: { net: Net | null; view: Net["view"] }) {
  const show = net?.view === view ? net : null;
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={show ? `0 0 ${show.w} ${show.h}` : undefined}
    >
      {show?.paths.map((p, i) => (
        <Fragment key={i}>
          <path d={p.d} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
          <RelayDot path={p} cycle={show.cycle} />
        </Fragment>
      ))}
    </svg>
  );
}

function StepCard({ step, className, style }: { step: Step; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      data-flow-id={step.id}
      className={cn(
        "relative rounded-lg border px-3.5 py-2.5",
        step.dark ? "border-ink bg-ink" : "border-black/10 bg-white",
        className,
      )}
      style={style}
    >
      {step.num && (
        <span
          className={cn(
            "absolute right-2.5 top-2 font-mono text-[9px]",
            step.dark ? "text-white/40" : "text-black/30",
          )}
        >
          {step.num}
        </span>
      )}
      <div
        className={cn(
          "font-mono text-[9px] uppercase tracking-widest md:hidden",
          step.dark ? "text-white/40" : "text-black/40",
        )}
      >
        {LANES[step.lane]}
      </div>
      <div
        className={cn(
          "text-[13px] font-medium leading-tight md:text-sm",
          step.dark ? "text-white" : "text-black",
        )}
      >
        {step.title}
      </div>
      <div
        className={cn(
          "mt-1 space-y-0.5 font-mono text-[10px] leading-snug break-words",
          step.dark ? "text-white/60" : "text-black/45",
        )}
      >
        {step.sub.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}

export function ChiselWorkflow({ className }: { className?: string }) {
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const [net, setNet] = useState<Net | null>(null);

  const measure = useCallback(() => {
    // Both layouts are in the DOM; measure whichever the breakpoint shows.
    const desktop = desktopRef.current;
    const mobile = mobileRef.current;
    const view: Net["view"] | null = desktop?.offsetWidth
      ? "desktop"
      : mobile?.offsetWidth
        ? "mobile"
        : null;
    if (!view) return;
    const root = view === "desktop" ? desktop! : mobile!;
    const links = view === "desktop" ? DESKTOP_LINKS : MOBILE_LINKS;
    const base = root.getBoundingClientRect();
    const svg = root.querySelector("svg");
    if (!svg) return;
    // A scratch path in the live svg to read each route's real length —
    // hop duration is length ÷ DOT_SPEED, so dot speed is constant and the
    // short gap hops flick across while the loop takes its time.
    const scratch = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.appendChild(scratch);
    const hops: { link: Link; d: string; dur: number }[] = [];
    for (const link of links) {
      const from = root.querySelector(`[data-flow-id="${link.from}"]`);
      const to = root.querySelector(`[data-flow-id="${link.to}"]`);
      if (!from || !to) {
        scratch.remove();
        return;
      }
      const d = routePath(
        anchor(from.getBoundingClientRect(), link.fromSide, base),
        link.fromSide,
        anchor(to.getBoundingClientRect(), link.toSide, base, link.toDx),
        link.toSide,
        link.ext,
      );
      scratch.setAttribute("d", d);
      hops.push({
        link,
        d,
        dur: Math.max(MIN_HOP_SEC, scratch.getTotalLength() / DOT_SPEED),
      });
    }
    scratch.remove();
    // Each slot opens when the previous slot's longest hop lands; parallel
    // forks share a slot and simply finish at their own times.
    const slotDur = Array<number>(SLOTS).fill(0);
    for (const hop of hops)
      slotDur[hop.link.slot] = Math.max(slotDur[hop.link.slot], hop.dur);
    const slotStart: number[] = [];
    let acc = 0;
    for (let s = 0; s < SLOTS; s++) {
      slotStart[s] = acc;
      acc += slotDur[s];
    }
    const cycle = Math.round((acc + REST_SEC) * 100) / 100;
    const f = (t: number) => Math.round((t / cycle) * 1e4) / 1e4;
    const paths: NetPath[] = hops.map((hop) => ({
      d: hop.d,
      t0: f(slotStart[hop.link.slot]),
      t1: f(slotStart[hop.link.slot] + hop.dur),
    }));
    const next: Net = {
      view,
      w: Math.round(base.width),
      h: Math.round(base.height),
      cycle,
      paths,
    };
    setNet((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
    );
  }, []);

  useEffect(() => {
    measure();
    const el = desktopRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div
      className={cn(
        "rounded-xl border border-black/10 bg-white p-4 md:p-6",
        className,
      )}
    >
      {/* Desktop: the swimlane graph. pt-12 reserves the arch lane for the
          iterate loop over the top row. */}
      <div ref={desktopRef} className="relative hidden md:block">
        <FlowSvg net={net} view="desktop" />
        <div className="relative grid grid-cols-[auto_repeat(5,minmax(0,1fr))] items-center gap-x-7 gap-y-9 pt-12">
          {LANES.map((lane, i) => (
            <div
              key={lane}
              className={cn(GRAPHIC_LABEL, "text-black")}
              style={{ gridColumn: 1, gridRow: i + 1 }}
            >
              {lane}
            </div>
          ))}
          {STEPS.map((step) => (
            <StepCard
              key={step.id}
              step={step}
              style={{ gridColumn: step.col + 1, gridRow: step.lane + 1 }}
            />
          ))}
        </div>
      </div>

      {/* Mobile: the same relay as one ordered column, lanes as chips, with
          the iterate loop arching up the left margin (hence the pl). */}
      <div ref={mobileRef} className="relative md:hidden">
        <FlowSvg net={net} view="mobile" />
        <div className="relative flex flex-col gap-7 pl-8">
          {STEPS.map((step) => (
            <StepCard key={step.id} step={step} />
          ))}
        </div>
      </div>
    </div>
  );
}
