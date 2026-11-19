"use client";

import type { ReactNode } from "react";
import { useHydrated } from "@/lib/onboarding/store";

/** Renders its screen once hydrated. Pages use it so the page itself still renders on the server. */
export default function AfterHydration({ children }: { children: ReactNode }) {
  return useHydrated() ? children : null;
}
