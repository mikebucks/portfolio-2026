import { redirect } from "next/navigation";

// Projects now live as a section on the homepage. Preserve the old URL by
// redirecting to the section anchor, which smooth-scrolls into view on load.
export default function ProjectsIndexPage() {
  redirect("/#projects");
}
