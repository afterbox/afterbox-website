"use client";

import { useSyncExternalStore } from "react";

/**
 * Which finds each worth-a-look flag's cancel guide walks through, when the member changes the suggestion.
 * Ids only, in memory: a reload falls back to the flag's own `defaultPlan`.
 */
let plans: Record<string, string[]> = {};
const listeners = new Set<() => void>();

export function setPlan(flagId: string, findIds: string[]) {
  plans = { ...plans, [flagId]: findIds };
  listeners.forEach((listener) => listener());
}

export function usePlans() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => plans,
    () => plans,
  );
}

export const planFor = (all: Record<string, string[]>, flag: { id: string; defaultPlan: string[] }) => all[flag.id] ?? flag.defaultPlan;
