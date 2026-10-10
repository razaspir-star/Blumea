"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { startNavigationProgress } from "@/lib/navigation-progress";

type AppLinkProps = ComponentProps<typeof Link>;

// Drop-in replacement for next/link's Link that also starts the top
// navigation progress bar on click, the same way useAppRouter does for
// programmatic navigation. Skips modified clicks (new tab, download, etc.),
// which Next.js itself doesn't intercept either.
export default function AppLink({ onClick, ...props }: AppLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const isModified =
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey;

    if (!isModified) {
      startNavigationProgress();
    }

    onClick?.(event);
  }

  return <Link {...props} onClick={handleClick} />;
}
