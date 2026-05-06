import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AudioProvider } from "@/components/audio/AudioProvider";
import { SmoothScroll } from "@/components/animation/SmoothScroll";

export const metadata: Metadata = {
  title: "Portfolio — 2026",
  description:
    "Design-engineering portfolio. Interfaces, systems, and the occasional audiovisual instrument.",
  metadataBase: new URL("https://example.com"),
};

// theme-color only tints Safari's chrome — its backdrop blur still reads from
// whatever pixels sit beneath it. The cream sliver rendered below paints those
// pixels so the frame reads as the visual edge of the page.
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
      <body className="min-h-dvh antialiased relative">
        <SmoothScroll />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[100] border-[10px] border-[#f4f1ea]"
        />
        {/* Cream strip behind Safari's translucent bottom address bar so its
            backdrop blur reads as the frame, not the dark page. Collapses to
            zero height when the chrome is collapsed. */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 z-[99] bg-[#f4f1ea]"
          style={{
            top: "100dvh",
            height: "calc(100lvh - 100dvh)",
          }}
        />
        <AudioProvider>
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
