import { OG, SITE } from "@/lib/siteMeta";
import { PIANO_PATH, PIANO_VIEW_BOX } from "@/components/icons";

// 1200x630 link-preview card, rendered by Satori: flexbox only, every parent
// needs an explicit `display`, no site CSS.
export function OgCard({
  kicker,
  title,
  description,
}: {
  kicker?: string;
  title: string;
  description?: string;
}) {
  const titleSize = title.length > 30 ? 68 : 84;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: OG.cream,
        color: OG.ink,
        // Supplied by loadOgFonts(); a missing font fails loudly.
        fontFamily: "Inter",
        padding: "72px 80px",
        border: `2px solid ${OG.ink}14`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 28,
          letterSpacing: "-0.02em",
        }}
      >
        <div style={{ display: "flex" }}>
          <span>Mike</span>
          <span style={{ fontWeight: 700 }}>Bucks</span>
        </div>
        {/* Bare <path>: Satori has no currentColor or <g> composition. */}
        <svg
          width={36}
          height={36}
          viewBox={PIANO_VIEW_BOX}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={PIANO_PATH} fill={OG.ink} />
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {kicker ? (
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: OG.accent,
              marginBottom: 24,
            }}
          >
            {kicker}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            fontSize: titleSize,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            lineHeight: 1.04,
          }}
        >
          {title}
        </div>
        {description ? (
          <div
            style={{
              display: "flex",
              fontSize: 30,
              lineHeight: 1.35,
              color: "#11111199",
              marginTop: 24,
              maxWidth: 900,
            }}
          >
            {description}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            // letterSpacing: "0.06em",
            color: "#11111180",
            marginTop: 20,
          }}
        >
          {SITE.url.replace("https://", "")}
        </div>
      </div>
    </div>
  );
}
