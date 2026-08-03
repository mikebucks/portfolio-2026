import { HomeClient } from "@/components/home/HomeClient";
import { projects } from "@/data/projects";

// The output is the same for every slug (the modal resolves it on the client),
// but listing them prerenders the shareable ones instead of server-rendering
// each on demand. Unknown slugs still render on request.
export async function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

// A project case study is a modal over the homepage, not a page of its own —
// but it keeps a real, shareable URL. The homepage tree renders here and
// `ProjectModal` reads the slug off the path on mount, so a direct load lands
// with the case study already open.
//
// The slug isn't validated here: an unknown or `comingSoon` slug leaves the
// modal closed and the visitor on the homepage, same as before. Swap this for a
// `notFound()` if a real 404 is wanted (it'd need a not-found.tsx to match the
// site — the stock Next page doesn't).
export default function ProjectPage() {
  return <HomeClient />;
}
