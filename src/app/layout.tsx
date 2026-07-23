import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AudioProvider } from "@/components/audio/AudioProvider";
import { SynthKeyboard } from "@/components/audio/SynthKeyboard";
import { SmoothScroll } from "@/components/animation/SmoothScroll";

export const metadata: Metadata = {
  title: "Portfolio — 2026",
  description:
    "Design-engineering portfolio. Interfaces, systems, and the occasional audiovisual instrument.",
  metadataBase: new URL("https://example.com"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  themeColor: "#f4f1ea",
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
    <html lang="en">
      {/* svh, not dvh: dvh is re-resolved on every step of iOS Safari's toolbar
          animation, relayouting mid-scroll on the same frames the fixed shader
          layer is being composited. svh is the static small-viewport height. */}
      <body className="min-h-svh antialiased relative">
        <SmoothScroll />
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
