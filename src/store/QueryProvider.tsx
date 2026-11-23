"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { configureClient } from "@/lib/api/client";
import { silentUnlock, stepUp } from "@/lib/security/keychain";
import { emitSessionEvent, getQueryClient } from "./queryClient";

// Wired once, on import in the browser: before any request can be made.
configureClient({
  unlock: silentUnlock,
  stepUp,
  signedOut: () => emitSessionEvent("signed-out"),
});

export default function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
