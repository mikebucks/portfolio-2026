"use client";

import type { MouseEvent, ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/device";
import { navigate, projectPath } from "@/lib/appRoute";

/**
 * Inline prose link into a project case study. Client-side navigation so the
 * modal plays its rise-from-the-bottom entrance instead of a hard load.
 * See ProjectModal.
 */
export function ProjectLink({
  slug,
  className,
  children,
}: {
  slug: string;
  className?: string;
  children: ReactNode;
}) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    // Modified clicks (new tab, etc.) and reduced-motion users keep the plain
    // anchor — /projects/<slug> serves the same page with the modal open, just
    // without the entrance.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (prefersReducedMotion()) return;

    e.preventDefault();
    navigate(projectPath(slug));
  }

  return (
    <a href={projectPath(slug)} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
