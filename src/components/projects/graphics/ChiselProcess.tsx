import { Fragment, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { GRAPHIC_LABEL } from "./shared";

/**
 * Animated replacement for the static chisel-process.png. Two panels — THEN, a
 * linear pipeline where Design is a dedicated stage, and NOW, the same pipeline
 * with Design dissolved into a Chisel bar that touches every stage. Connectors
 * carry a travelling accent dot (`.chisel-dot` in globals.css) instead of the
 * old arrows.
 *
 * ≥ md the pipeline runs left→right like the original image; below md the
 * cards stack vertically, and the NOW panel's Chisel bar becomes a vertical
 * rail alongside the stack — the whole diagram rotated, not squeezed.
 */

type Stage = { title: string; roles: string; dark?: boolean };

const THEN: Stage[] = [
  { title: "Customer need", roles: "PM, ELT, PD" },
  { title: "Product definition", roles: "PM, PD" },
  { title: "Design", roles: "PD", dark: true },
  { title: "Build", roles: "Eng" },
  { title: "Test", roles: "Eng, PM, PD" },
  { title: "Ship", roles: "Eng" },
  { title: "Measure", roles: "PM, PD" },
];

const NOW: Stage[] = [
  { title: "Customer need", roles: "PM, ELT, PD" },
  { title: "Product definition", roles: "PM, PD" },
  { title: "Build", roles: "Eng" },
  { title: "Test", roles: "Eng, PM, PD" },
  { title: "Ship", roles: "PM, Eng" },
  { title: "Measure", roles: "PM, PD" },
];

const CHISEL_ROLES = "PD, PM, Eng, ELT";

/** Seconds between neighbouring dots — negative delays keep them mid-cycle. */
const STAGGER = 0.3;

function delayStyle(i: number, offset = 0): CSSProperties {
  return { "--flow-delay": `${-i * STAGGER - offset}s` } as CSSProperties;
}

function Dot({
  axis,
  index,
  reverse,
  fast,
  offset,
}: {
  axis: "x" | "y";
  index: number;
  reverse?: boolean;
  /** Double tempo — the Chisel-connector treatment. */
  fast?: boolean;
  /** Extra seconds of (negative) delay, past the index stagger. */
  offset?: number;
}) {
  return (
    <span
      className={cn(
        "chisel-dot",
        axis === "x" ? "chisel-dot-x" : "chisel-dot-y",
        reverse && "chisel-dot-reverse",
        fast && "chisel-dot-fast",
      )}
      style={delayStyle(index, offset)}
    />
  );
}

/**
 * Hairline connector with travelling dots, on either axis. Plain pipeline
 * connectors carry a single dot at strolling pace; `pair` marks a connector
 * that touches the Chisel bar, where the traffic doubles up — two dots at
 * double tempo, one each way, half a cycle apart so one arrives as the other
 * departs. That faster, denser exchange is the point of the diagram, so it
 * follows the Chisel connectors whatever axis the current layout gives them.
 */
function Line({
  axis,
  index,
  pair,
  className,
  style,
}: {
  axis: "x" | "y";
  index: number;
  pair?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative bg-black/15",
        axis === "x" ? "h-px" : "w-px",
        className,
      )}
      style={style}
    >
      <Dot axis={axis} index={index} fast={pair} />
      {pair && <Dot axis={axis} index={index} fast reverse offset={0.6} />}
    </div>
  );
}

function HLine(props: Omit<Parameters<typeof Line>[0], "axis">) {
  return <Line axis="x" {...props} />;
}

function VLine(props: Omit<Parameters<typeof Line>[0], "axis">) {
  return <Line axis="y" {...props} />;
}

function StageCard({
  stage,
  className,
  style,
}: {
  stage: Stage;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3.5 py-2.5",
        stage.dark ? "border-ink bg-ink" : "border-black/10 bg-white",
        className,
      )}
      style={style}
    >
      <div
        className={cn(
          "text-[13px] font-medium leading-tight md:text-sm",
          stage.dark ? "text-white" : "text-black",
        )}
      >
        {stage.title}
      </div>
      <div
        className={cn(
          "mt-1 text-[11px] leading-tight",
          stage.dark ? "text-white/60" : "text-black/45",
        )}
      >
        {stage.roles}
      </div>
    </div>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="m3 12.5 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </svg>
  );
}

function ChiselBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md border border-white/20",
        className,
      )}
    >
      <LayersIcon className="size-4.5 text-white" />
    </span>
  );
}

/** The full-width dark Chisel bar under the NOW pipeline (≥ md). */
function ChiselBar() {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-ink px-4 py-3">
      <ChiselBadge />
      <div>
        <div className="text-sm font-semibold leading-tight text-white">
          Chisel
        </div>
        <div className="mt-0.5 text-[11px] leading-tight text-white/60">
          {CHISEL_ROLES}
        </div>
      </div>
    </div>
  );
}

/** The same bar rotated into a vertical rail for the stacked mobile layout. */
function ChiselRail({ style }: { style?: CSSProperties }) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-lg bg-ink px-2.5 py-4"
      style={style}
    >
      <ChiselBadge />
      <div className="flex gap-1.5 [writing-mode:vertical-rl]">
        <span className="text-sm font-semibold text-white">Chisel</span>
        <span className="text-[11px] text-white/60">{CHISEL_ROLES}</span>
      </div>
    </div>
  );
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return <div className={cn(GRAPHIC_LABEL, "text-black")}>{children}</div>;
}

export function ChiselProcess({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* THEN — a strictly linear relay. */}
      <section className="rounded-xl border border-black/10 bg-white p-4 md:p-5">
        <PanelLabel>THEN</PanelLabel>

        {/* Desktop: left→right pipeline. */}
        <div className="mt-4 hidden items-stretch md:flex">
          {THEN.map((stage, i) => (
            <Fragment key={stage.title}>
              {i > 0 && (
                <HLine index={i} className="w-6 shrink-0 self-center" />
              )}
              <StageCard stage={stage} className="min-w-0 flex-1" />
            </Fragment>
          ))}
        </div>

        {/* Mobile: the same pipeline top→bottom. */}
        <div className="mt-4 md:hidden">
          {THEN.map((stage, i) => (
            <Fragment key={stage.title}>
              {i > 0 && <VLine index={i} className="mx-auto h-7" />}
              <StageCard stage={stage} />
            </Fragment>
          ))}
        </div>
      </section>

      {/* NOW — Design dissolves into Chisel, which touches every stage. */}
      <section className="rounded-xl border border-black/10 bg-white p-4 md:p-5">
        <PanelLabel>NOW</PanelLabel>

        {/* Desktop: pipeline, drop lines, then the Chisel bar. Each drop line
            carries a dot in both directions, like the ↕ arrows in the
            original image. */}
        <div className="mt-4 hidden md:block">
          <div className="flex items-stretch">
            {NOW.map((stage, i) => (
              <Fragment key={stage.title}>
                {i > 0 && (
                  <HLine index={i} className="w-6 shrink-0 self-center" />
                )}
                <StageCard stage={stage} className="min-w-0 flex-1" />
              </Fragment>
            ))}
          </div>
          {/* Mirrors the flex math of the card row above (flex-1 cells with
              w-6 spacers) so each drop line stays centred under its card. */}
          <div className="flex">
            {NOW.map((stage, i) => (
              <Fragment key={stage.title}>
                {i > 0 && <div aria-hidden className="w-6 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <VLine index={i} pair className="mx-auto h-7" />
                </div>
              </Fragment>
            ))}
          </div>
          <ChiselBar />
        </div>

        {/* Mobile: cards stack in column 1, the Chisel rail runs alongside in
            column 3, and every card gets its own connector across column 2 —
            the desktop diagram rotated 90°. Cards sit on odd grid rows with
            the between-card connectors on the even rows, and the rail spans
            them all. */}
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_1.75rem_auto] md:hidden">
          {NOW.map((stage, i) => (
            <Fragment key={stage.title}>
              <StageCard
                stage={stage}
                style={{ gridColumn: 1, gridRow: 2 * i + 1 }}
              />
              {i < NOW.length - 1 && (
                <VLine
                  index={i}
                  className="mx-auto h-7"
                  style={{ gridColumn: 1, gridRow: 2 * i + 2 }}
                />
              )}
              <HLine
                index={i}
                pair
                className="w-full self-center"
                style={{ gridColumn: 2, gridRow: 2 * i + 1 }}
              />
            </Fragment>
          ))}
          <ChiselRail
            style={{ gridColumn: 3, gridRow: `1 / ${2 * NOW.length}` }}
          />
        </div>
      </section>
    </div>
  );
}
