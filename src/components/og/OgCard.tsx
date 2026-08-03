import { OG, SITE } from "@/lib/siteMeta";

/**
 * The 1200x630 link-preview card, shared by the site-wide OG route and the
 * per-project one. Rendered by Satori (next/og), not a browser: only flexbox
 * lays out, every element with children needs an explicit `display`, and there
 * is no access to the site's CSS — hence the tokens imported from siteMeta.
 *
 * Typographic rather than screenshot-based on purpose. Project thumbnails are
 * arbitrary aspect ratios that centre-crop badly to 1.91:1, and five of the
 * projects have no thumbnail at all; generated cards give every project the
 * same treatment with no asset to maintain.
 */
export function OgCard({
  kicker,
  title,
  description,
}: {
  kicker?: string;
  title: string;
  description?: string;
}) {
  // Long case-study titles step down a size rather than wrapping to three lines.
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
        // Matches the site's --font-display. Supplied by loadOgFonts() at both
        // call sites; naming it explicitly means a missing font shows up as a
        // rendering failure rather than silently falling back to regular.
        fontFamily: "Inter",
        padding: "72px 80px",
        // The site's signature 10px cream frame reads as an inset rule here,
        // where the whole card is already cream.
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
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: 999,
            backgroundColor: OG.accent,
          }}
        />
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
          style={{ width: 72, height: 6, backgroundColor: OG.accent }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 24,
            letterSpacing: "0.06em",
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
