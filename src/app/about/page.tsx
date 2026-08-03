import { HomeClient } from "@/components/home/HomeClient";

// About is a section of the homepage, not a page of its own — but it keeps a
// real URL so it can be linked and reloaded. The homepage tree is what renders
// here; `useRouteScroll` reads the path on mount and scrolls to #about.
export default function AboutPage() {
  return <HomeClient />;
}
