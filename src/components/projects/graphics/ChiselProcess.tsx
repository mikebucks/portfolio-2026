import { Fragment, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { GRAPHIC_LABEL } from "./shared";

/**
 * THEN: linear pipeline with Design as a stage. NOW: Design dissolves into a
 * Chisel bar touching every stage. Connectors carry dots (.chisel-dot, globals.css).
 * ≥ md runs left→right; below md stacks, and the NOW bar becomes a vertical rail.
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

/** Seconds between neighbouring dots (negative delays start mid-cycle). */
const STAGGER = 0.3;

/** Seconds per THEN relay hop; globals.css's 7.2s cycle = 6 × this. */
const RELAY_SLOT_SEC = 1.2;
const RELAY_SLOTS = 6;

function delayStyle(i: number, offset = 0): CSSProperties {
  return { "--flow-delay": `${-i * STAGGER - offset}s` } as CSSProperties;
}

/** Negative delay landing connector `i` (1-based) in its relay slot. */
function relayDelayStyle(i: number): CSSProperties {
  return {
    "--flow-delay": `${(i - 1 - RELAY_SLOTS) * RELAY_SLOT_SEC}s`,
  } as CSSProperties;
}

function Dot({
  axis,
  index,
  reverse,
  fast,
  relay,
  offset,
}: {
  axis: "x" | "y";
  index: number;
  reverse?: boolean;
  /** Double tempo (Chisel connectors). */
  fast?: boolean;
  /** Baton-pass (THEN pipeline). */
  relay?: boolean;
  /** Extra negative delay past the stagger. */
  offset?: number;
}) {
  return (
    <span
      className={cn(
        "chisel-dot",
        axis === "x" ? "chisel-dot-x" : "chisel-dot-y",
        reverse && "chisel-dot-reverse",
        fast && "chisel-dot-fast",
        relay && "chisel-dot-relay",
      )}
      style={relay ? relayDelayStyle(index) : delayStyle(index, offset)}
    />
  );
}

/** Hairline connector with dots. `pair` = Chisel connector: two fast dots, one each way, half a cycle apart. */
function Line({
  axis,
  index,
  pair,
  relay,
  className,
  style,
}: {
  axis: "x" | "y";
  index: number;
  pair?: boolean;
  /** Baton-pass dot (THEN pipeline). */
  relay?: boolean;
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
      <Dot axis={axis} index={index} fast={pair} relay={relay} />
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
  active,
  pulseIndex,
  className,
  style,
}: {
  stage: Stage;
  /** Permanent live-step stroke (NOW cards). */
  active?: boolean;
  /** Pulse as relay hop N's dot arrives (THEN). First card passes 0.5: lit half a slot before the cycle wraps. */
  pulseIndex?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const pulseStyle =
    pulseIndex !== undefined
      ? ({
          "--flow-delay": `${(pulseIndex - 1 - RELAY_SLOTS) * RELAY_SLOT_SEC}s`,
        } as CSSProperties)
      : undefined;
  return (
    <div
      className={cn(
        "rounded-lg border px-3.5 py-2.5",
        stage.dark ? "border-ink bg-ink" : "border-black/10 bg-white",
        active && "chisel-card-active",
        pulseIndex !== undefined && "chisel-card-pulse",
        className,
      )}
      style={{ ...pulseStyle, ...style }}
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

/** Dark Chisel bar under the NOW pipeline (≥ md). */
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

/** The bar as a vertical rail for mobile. */
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
      <section className="rounded-xl border border-black/10 bg-white p-4 md:p-5">
        <PanelLabel>THEN</PanelLabel>

        <div className="mt-4 hidden items-stretch md:flex">
          {THEN.map((stage, i) => (
            <Fragment key={stage.title}>
              {i > 0 && (
                <HLine index={i} relay className="w-6 shrink-0 self-center" />
              )}
              <StageCard
                stage={stage}
                pulseIndex={i > 0 ? i : 0.5}
                className="min-w-0 flex-1"
              />
            </Fragment>
          ))}
        </div>

        <div className="mt-4 md:hidden">
          {THEN.map((stage, i) => (
            <Fragment key={stage.title}>
              {i > 0 && <VLine index={i} relay className="mx-auto h-7" />}
              <StageCard stage={stage} pulseIndex={i > 0 ? i : 0.5} />
            </Fragment>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-4 md:p-5">
        <PanelLabel>NOW</PanelLabel>

        <div className="mt-4 hidden md:block">
          <div className="flex items-stretch">
            {NOW.map((stage, i) => (
              <Fragment key={stage.title}>
                {i > 0 && (
                  <HLine index={i} className="w-6 shrink-0 self-center" />
                )}
                <StageCard stage={stage} active className="min-w-0 flex-1" />
              </Fragment>
            ))}
          </div>
          {/* Mirrors the card row's flex math so drop lines stay centred under their cards. */}
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

        {/* Mobile: cards on odd rows, connectors on even rows, rail spans all — desktop rotated 90°. */}
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_1.75rem_auto] md:hidden">
          {NOW.map((stage, i) => (
            <Fragment key={stage.title}>
              <StageCard
                stage={stage}
                active
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
