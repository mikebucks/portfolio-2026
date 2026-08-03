import type { Metadata } from "next";
import { HomeClient } from "@/components/home/HomeClient";
import { SITE } from "@/lib/siteMeta";

// About is a section of the homepage, not a page of its own — but it keeps a
// real URL so it can be linked and reloaded. The homepage tree is what renders
// here; `useRouteScroll` reads the path on mount and scrolls to #about.
//
// The metadata below therefore describes the *link preview*, not a distinct
// document: the page a visitor lands on is the homepage, scrolled.
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
