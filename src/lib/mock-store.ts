"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { PlatformId } from "@/lib/mock-data";

// Prototype-only state kept in this browser's localStorage so that mock actions
// (analyze a video, upload a file, disconnect an account) feel real between pages.
// Replace with real data once the backend exists. Nothing here is user data.

export type ConnectionStatus = "connected" | "disconnected" | "needs_reconnect";

type MockState = {
  analyzed: string[];
  deep: string[];
  connections: Partial<Record<PlatformId, ConnectionStatus>>;
};

const STORAGE_KEY = "blumea_mock_state_v1";
const CHANGE_EVENT = "blumea-mock-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function getServerSnapshot(): string {
  return "";
}

function parse(raw: string): MockState {
  const empty: MockState = { analyzed: [], deep: [], connections: {} };

  if (!raw) {
    return empty;
  }

  try {
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return empty;
  }
}

function write(update: (state: MockState) => MockState) {
  try {
    const next = update(parse(getSnapshot()));

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Storage can be unavailable (private mode). The prototype just stops remembering.
  }
}

export function useMockStore(seedAnalyzed: string[]) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const state = useMemo(() => parse(raw), [raw]);

  const analyzedIds = useMemo(
    () => Array.from(new Set([...seedAnalyzed, ...state.analyzed])),
    [seedAnalyzed, state.analyzed]
  );

  const markAnalyzed = useCallback((id: string) => {
    write((current) => ({ ...current, analyzed: Array.from(new Set([...current.analyzed, id])) }));
  }, []);

  const markDeep = useCallback((ids: string[]) => {
    write((current) => ({
      ...current,
      analyzed: Array.from(new Set([...current.analyzed, ...ids])),
      deep: Array.from(new Set([...current.deep, ...ids])),
    }));
  }, []);

  const setConnection = useCallback((platform: PlatformId, status: ConnectionStatus) => {
    write((current) => ({
      ...current,
      connections: { ...current.connections, [platform]: status },
    }));
  }, []);

  return {
    analyzedIds,
    deepIds: state.deep,
    connections: state.connections,
    markAnalyzed,
    markDeep,
    setConnection,
  };
}
