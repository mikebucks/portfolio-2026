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
};

// Match Safari's translucent UI chrome to the fixed 10px border in <body>
// so the address bar / status bar read as part of the frame instead of
// revealing the dark page content behind them.
export const viewport: Viewport = {
  themeColor: "#f4f1ea",
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
          className="pointer-events-none fixed inset-0 z-[100] border-[10px] border-cream"
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
