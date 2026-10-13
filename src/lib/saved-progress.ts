"use client";

import { useSyncExternalStore } from "react";

// Per-browser "resume where you left off" for lessons and the builder.
// Storage can be missing or blocked (private mode); everything still works
// without it, it just won't resume.

export function readSaved<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeSaved<T>(key: string, value: T | null) {
  try {
    if (value) window.localStorage.setItem(key, JSON.stringify(value));
    else window.localStorage.removeItem(key);
  } catch {
    // Storage blocked: nothing to do.
  }
}

const noSubscribe = () => () => {};

/**
 * False during the server render and hydration, true after. Key a component
 * on it to remount with saved state once hydrated, so markup always matches.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}
