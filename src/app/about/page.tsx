import type { Metadata } from "next";
import { HomeClient } from "@/components/home/HomeClient";
import { SITE } from "@/lib/siteMeta";

// About is a homepage section with its own URL; useRouteScroll scrolls to it on mount.
export const metadata: Metadata = {
  title: "About",
  description:
    "High impact IC with a builder's mindset — design, engineering, strategy and growth across digital products.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About — ${SITE.name}`,
    url: `${SITE.url}/about`,
  },
};

export default function AboutPage() {
  return <HomeClient />;
}
