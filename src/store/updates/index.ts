"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

/** The landing page's "Get updates". `website` is the honeypot: always sent, empty for people. */
export function useJoinUpdates() {
  return useMutation({
    mutationFn: ({ email, website }: { email: string; website: string }) =>
      api.post("/v1/updates", { email: email.trim(), website }),
  });
}
