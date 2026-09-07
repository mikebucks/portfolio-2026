"use client";

import type { MouseEvent, ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/device";
import { navigate, projectPath } from "@/lib/appRoute";

/** Prose link into a case study; client-side nav so ProjectModal plays its entrance. */
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
    // Modified clicks and reduced motion keep the plain anchor.
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
