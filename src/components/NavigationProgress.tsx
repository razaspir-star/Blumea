"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  getNavigationProgressSnapshot,
  stopNavigationProgress,
  subscribeNavigationProgress,
} from "@/lib/navigation-progress";

// A thin, indeterminate progress bar shown for the duration of a page
// transition — however long that actually takes, dev-mode compiles included.
// Mounted once in the root layout, so it covers every route in the app.
export default function NavigationProgress() {
  const pending = useSyncExternalStore(
    subscribeNavigationProgress,
    getNavigationProgressSnapshot,
    () => false
  );
  const pathname = usePathname();

  // The pathname only changes once the destination has actually rendered —
  // that's what turns the bar back off.
  useEffect(() => {
    stopNavigationProgress();
  }, [pathname]);

  if (!pending) {
    return null;
  }

  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[200] h-[3px] overflow-hidden bg-blumea-mist"
    >
      <div className="blumea-nav-progress-bar h-full w-1/3 rounded-r-full bg-blumea-blue" />
    </div>
  );
}
