"use client";

import { useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};

/** False on the server and while hydrating, true after (client navigations get true straight away). */
export function useHydrated() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}
