import { redirect } from "next/navigation";

type Params = { slug: string };

// Project detail now lives in a hash-routed modal on the homepage. Preserve the
// old per-project URL by redirecting to the anchor, which opens the lightbox.
export default async function ProjectPage(
  props: { params: Promise<Params> },
) {
  const { slug } = await props.params;
  redirect(`/#projects/${slug}`);
}
