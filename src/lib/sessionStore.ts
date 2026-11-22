"use client";

import { useSyncExternalStore } from "react";

/**
 * State kept in sessionStorage and shared by every component that reads it, so layouts Next keeps
 * alive in the background never hold an older copy. The server (and hydration) sees `initial`.
 * `persist: "local"` keeps it in localStorage instead, so it outlives the tab and logging out.
 */
export function createSessionStore<T>(
  key: string,
  initial: T,
  revive: (saved: unknown) => T,
  { persist = "session" }: { persist?: "session" | "local" } = {},
) {
  let state: T | undefined;
  const listeners = new Set<() => void>();
  const storage = () => (persist === "local" ? localStorage : sessionStorage);

  function read(): T {
    try {
      const saved: unknown = JSON.parse(storage().getItem(key) ?? "null");
      return saved === null ? initial : revive(saved);
    } catch {
      return initial;
    }
  }

  function get(): T {
    if (typeof window === "undefined") return initial;
    if (state === undefined) state = read();
    return state;
  }

  function set(recipe: (current: T) => T) {
    const next = recipe(get());
    if (Object.is(next, state)) return;
    state = next;
    try {
      if (next === initial) storage().removeItem(key);
      else storage().setItem(key, JSON.stringify(next));
    } catch {
      // Private mode or a full quota: keep going in memory.
    }
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function useValue() {
    return useSyncExternalStore(subscribe, get, () => initial);
  }

  return { get, set, subscribe, useValue };
}
