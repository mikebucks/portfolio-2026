import { redirect } from "next/navigation";

// About now lives as a section on the homepage. Preserve the old URL by
// redirecting to the section anchor, which smooth-scrolls into view on load.
export default function AboutPage() {
  redirect("/#about");
}
