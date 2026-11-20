"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import type { DashboardState } from "@/lib/dashboard/mock";
import { useDashboardState, useLoaded } from "@/lib/dashboard/store";
import { transition } from "@/lib/motion";
import { useHydrated } from "@/lib/onboarding/store";

/**
 * Shows the route's skeleton until the mock data has arrived, then cross-fades into the page in the
 * same spot (both share one grid cell, so nothing jumps). Already loaded: the page shows straight away.
 */
export default function Ready({
  skeleton,
  children,
}: {
  skeleton: ReactNode;
  children: (state: DashboardState) => ReactNode;
}) {
  const hydrated = useHydrated();
  const loaded = useLoaded();
  const state = useDashboardState();
  const ready = hydrated && loaded && state !== null;
  // Arriving with the data already there skips the cross-fade (the route's own fade covers it).
  const [waited] = useState(!ready);

  if (ready && !waited) return <>{children(state)}</>;

  return (
    <div className="grid">
      <AnimatePresence initial={false}>
        {ready ? (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={transition("base")}
            className="[grid-area:1/1] min-w-0"
          >
            {children(state)}
          </motion.div>
        ) : (
          <motion.div
            key="skeleton"
            exit={{ opacity: 0 }}
            transition={transition("base")}
            className="pointer-events-none [grid-area:1/1] min-w-0"
          >
            {skeleton}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
