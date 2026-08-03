"use client";

import type { MouseEvent, ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/device";
import { captureProjectOrigin } from "@/lib/projectTransition";
import { navigate, projectPath } from "@/lib/appRoute";

/**
 * Inline prose link into a project case study. Same hand-off the project cards
 * and rows use: stash the link's own rect so the modal's cream cover grows out
 * of the text that was clicked, rather than falling back to the frame-expand.
 * See projectTransition + ProjectModal.
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
    // without the grow.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (prefersReducedMotion()) return;

    e.preventDefault();
    captureProjectOrigin(e.currentTarget);
    navigate(projectPath(slug));
  }

  return (
    <a href={projectPath(slug)} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
