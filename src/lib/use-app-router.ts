"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { startNavigationProgress } from "@/lib/navigation-progress";

// Drop-in replacement for next/navigation's useRouter(): same push/replace
// API, but flips on the top progress bar first so every programmatic
// navigation (sidebar buttons, modals, redirects) gets visible feedback,
// not just <Link> clicks.
export function useAppRouter() {
  const router = useRouter();

  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) => {
        startNavigationProgress();
        router.push(href, options);
      },
      replace: (href: string, options?: Parameters<typeof router.replace>[1]) => {
        startNavigationProgress();
        router.replace(href, options);
      },
    }),
    [router]
  );
}
