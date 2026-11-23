"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import { UnlockRequiredError, anyErrorCopy } from "@/lib/api/errors";
import { transition } from "@/lib/motion";
import { useHydrated } from "@/lib/useHydrated";
import { Lead } from "./bits";
import Page from "./Page";

function Failed({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Page>
      <h1 tabIndex={-1} className="mb-2 text-[27px]/[1.1] tracking-[-0.035em] text-ink outline-none sm:text-[32px]/[1.1]">
        That didn’t load
      </h1>
      <Lead className="mb-8">{anyErrorCopy(error)}</Lead>
      <Button variant="inkDeep" onClick={onRetry}>
        Try again
      </Button>
    </Page>
  );
}

/**
 * Shows the route's skeleton (shaped like the page) until the query has data, then cross-fades into the page in the
 * same spot (both share one grid cell, so nothing jumps). Already cached: the page shows straight away. A locked
 * record keeps the skeleton while the app moves to /unlock.
 */
export default function Ready<T>({ query, skeleton, children }: { query: UseQueryResult<T>; skeleton: ReactNode; children: (data: T) => ReactNode }) {
  const hydrated = useHydrated();
  const data = query.data;
  const ready = hydrated && data !== undefined;
  // Arriving with the data already there skips the cross-fade (the route's own fade covers it).
  const [waited] = useState(!ready);

  if (!ready && query.isError && !(query.error instanceof UnlockRequiredError)) {
    return <Failed error={query.error} onRetry={() => query.refetch()} />;
  }

  if (ready && !waited) return <>{children(data)}</>;

  return (
    <div className="grid">
      <AnimatePresence initial={false}>
        {ready ? (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={transition("base")} className="[grid-area:1/1] min-w-0">
            {children(data)}
          </motion.div>
        ) : (
          <motion.div key="skeleton" exit={{ opacity: 0 }} transition={transition("base")} className="pointer-events-none [grid-area:1/1] min-w-0">
            {skeleton}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
