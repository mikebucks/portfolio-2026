import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AudioProvider } from "@/components/audio/AudioProvider";
import { SynthKeyboard } from "@/components/audio/SynthKeyboard";
import { SmoothScroll } from "@/components/animation/SmoothScroll";
import { Analytics } from "@/components/analytics/Analytics";
import { SITE } from "@/lib/siteMeta";

// Variable font: one file covers 400–700, which is the full range the UI uses
// (normal / medium / semibold / bold). Exposed as a CSS variable rather than a
// class so --font-display in globals.css stays the single place typography is
// declared. `swap` keeps the system fallback painting during the font fetch —
// the hero animates in on load and must not wait on a font.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// `metadataBase` is what every relative URL below (and every generated OG
// image) is resolved against — get it wrong and share previews point at the
// wrong host. `title.template` lets each route export just its own title;
// `default` is what the homepage and any route without one falls back to.
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.title,
  authors: [{ name: SITE.author, url: SITE.url }],
  creator: SITE.author,
  publisher: SITE.author,
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  // The `images` key is deliberately absent: the opengraph-image.tsx route
  // convention supplies it (and the per-project override in
  // app/projects/[slug]/opengraph-image.tsx supplies theirs).
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    url: SITE.url,
    locale: "en_US",
  },
  // Without `summary_large_image` X renders a small square crop even when a
  // 1200x630 og:image is present. Platforms that find no twitter:image fall
  // back to og:image, so the OG routes cover both.
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
};

// Make Safari's translucent UI chrome read as part of the cream frame.
//
// Since Safari 26 (iOS 26 "Liquid Glass"), `theme-color` is IGNORED. Safari
// instead tints its status bar and floating address bar by sampling the
// `background-color` of position:fixed elements at the screen edges, falling
// back to the <body> background. The opaque cream frame bars in <body> are
// that sample; `viewport-fit: cover` is required so the page (and those bars)
// extends under the chrome for Safari to read them, and so the bars can fill
// the safe-area regions. `themeColor` is kept as a fallback for iOS < 26.
export const viewport: Viewport = {
  themeColor: "#f4f1ea",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      {/* svh, not dvh: dvh is re-resolved on every step of iOS Safari's toolbar
          animation, relayouting mid-scroll on the same frames the fixed shader
          layer is being composited. svh is the static small-viewport height. */}
      <body className="min-h-svh antialiased relative">
        <SmoothScroll />
        {/* Global Mixpanel wiring. Renders nothing; no-op until
            NEXT_PUBLIC_MIXPANEL_TOKEN is set. See src/components/analytics. */}
        <Analytics />
        {/* Cream frame. On iOS 26 each edge must be its own OPAQUE
            position:fixed element for Safari to sample its background-color and
            tint the chrome cream (Safari ignores absolute children of a fixed
            parent, and reads background-color, not border color — the old
            single border div was transparent, so nothing got sampled). Top and
            bottom fill the safe-area regions so the status bar and the floating
            address bar read cream, continuous with the frame; left/right are
            10px rails. On desktop the safe-area insets are 0, so every bar is
            10px — identical to the previous border. */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[calc(env(safe-area-inset-top,0px)+10px)] bg-cream"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] h-[calc(env(safe-area-inset-bottom,0px)+10px)] bg-cream"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-y-0 left-0 z-[100] w-[calc(env(safe-area-inset-left,0px)+10px)] bg-cream"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-y-0 right-0 z-[100] w-[calc(env(safe-area-inset-right,0px)+10px)] bg-cream"
        />
        <AudioProvider>
          <SynthKeyboard />
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black"
          >
            Skip to content
          </a>
          <Header />
          <main id="main" className="relative">
            {children}
          </main>
          <Footer />
        </AudioProvider>
      </body>
    </html>
  );
}
