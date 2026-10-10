"use client";

// A tiny external store for the top-of-page navigation progress bar
// (NavigationProgress.tsx). Kept outside React so any call site — a sidebar
// button, a modal, a plain <Link> — can flip it on the instant a navigation
// starts, before the destination page has even begun loading.
let pending = false;
const listeners = new Set<() => void>();

export function startNavigationProgress() {
  if (pending) {
    return;
  }

  pending = true;
  listeners.forEach((listener) => listener());
}

export function stopNavigationProgress() {
  if (!pending) {
    return;
  }

  pending = false;
  listeners.forEach((listener) => listener());
}

export function subscribeNavigationProgress(listener: () => void) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

export function getNavigationProgressSnapshot() {
  return pending;
}
