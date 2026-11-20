"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useOnboarding } from "@/lib/onboarding/store";
import { consumeTinkState } from "@/lib/onboarding/tink";

/**
 * Tink sends people back here. A wrong or missing `state` is treated as cancelled.
 * `?code` connects the bank; `?error` (USER_CANCELLED or anything else) is cancelled,
 * except a second bank, which goes back to the results with a note.
 * A renewal from the dashboard goes back to its bank page either way.
 */
export default function CallbackScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const { state, actions } = useOnboarding();
  const pending = state.pending;
  const handled = useRef(false);

  useEffect(() => {
    router.prefetch("/connect/cancelled");
    router.prefetch("/connect/reading");
    router.prefetch("/found");
  }, [router]);

  useEffect(() => {
    // The state is single use, so this must run once even when effects run twice in development.
    if (handled.current) return;
    handled.current = true;

    const valid = consumeTinkState(params.get("state"));
    const code = params.get("code");

    if (pending?.renew) {
      const bankHref = `/settings/banks/${pending.bankId}`;
      if (valid && code) {
        actions.connectPending(code);
        router.replace(`${bankHref}?renewed=1`);
      } else {
        actions.cancelPending();
        router.replace(bankHref);
      }
      return;
    }

    if (!valid) {
      router.replace("/connect/cancelled");
      return;
    }
    if (!pending) {
      router.replace("/connect/bank");
    } else if (code) {
      actions.connectPending(code);
      router.replace("/connect/reading");
    } else if (pending.another) {
      actions.failPending();
      router.replace("/found");
    } else {
      router.replace("/connect/cancelled");
    }
  }, [params, pending, actions, router]);

  return null;
}
