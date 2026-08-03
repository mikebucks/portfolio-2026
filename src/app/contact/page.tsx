import type { Metadata } from "next";
import { HomeClient } from "@/components/home/HomeClient";
import { SITE } from "@/lib/siteMeta";

// Contact is a section of the homepage. See src/app/about/page.tsx.
export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${SITE.name}.`,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: `Contact — ${SITE.name}`,
    url: `${SITE.url}/contact`,
  },
};

export default function ContactPage() {
  return <HomeClient />;
}
