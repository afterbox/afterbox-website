"use client";

import type { Transition } from "motion/react";
import { useSyncExternalStore } from "react";
import { transition, type Speed } from "@/lib/motion";

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Follows the setting live, so turning it on mid-visit takes effect without a reload. */
function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

/**
 * Reduced motion keeps opacity and drops movement: distances become 0, scales 1,
 * and size changes (height, width) and counters land at once.
 */
export function useMotionTokens() {
  const reduced = useReducedMotion();
  return {
    reduced,
    move: (px: number) => (reduced ? 0 : px),
    grow: (from: number) => (reduced ? 1 : from),
    /** For height and width, which MotionConfig's reduced mode doesn't cover. */
    resize: (speed: Speed, delay = 0): Transition => (reduced ? { duration: 0 } : transition(speed, delay)),
  };
}
