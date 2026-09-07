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

// `swap`: the hero animates on load and must not wait on the font.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

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
  // No `images`: the opengraph-image.tsx routes supply them.
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    url: SITE.url,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
};

// iOS 26 ignores theme-color and samples fixed edge elements instead (the cream
// frame bars); viewport-fit: cover lets them extend under the chrome. themeColor is for iOS < 26.
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
      {/* svh, not dvh: dvh relayouts on every step of iOS Safari's toolbar animation. */}
      <body className="min-h-svh antialiased relative">
        <SmoothScroll />
        <Analytics />
        {/* Cream frame: four opaque fixed bars, one per edge, so iOS 26 samples
            them to tint its chrome; top/bottom also fill the safe areas. */}
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
