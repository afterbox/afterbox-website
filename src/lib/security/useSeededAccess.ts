"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { useAccess, type Access } from "./store";

let seeded = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Access, held at "pending" until `seed` has run with the page's URL. Seeding happens in a layout
 * effect, before the first paint, so a `?mock=` scenario is in place before anything shows. `seed`
 * must be a module-level function; later URL changes go through the shell's Boot.
 */
export function useSeededAccess(seed: (params: URLSearchParams) => void): Access | "pending" {
  const access = useAccess();
  const ready = useSyncExternalStore(subscribe, () => seeded, () => false);

  useLayoutEffect(() => {
    seed(new URLSearchParams(window.location.search));
    if (seeded) return;
    seeded = true;
    listeners.forEach((listener) => listener());
  }, [seed]);

  return ready ? access : "pending";
}
