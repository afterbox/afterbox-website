"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import ScreenTitle from "@/components/ui/onboarding/ScreenTitle";
import Spinner from "@/components/ui/Spinner";
import { isApiError } from "@/lib/api/errors";
import { takeTinkReturn, useBankCallback } from "@/store/banks";

/**
 * Tink sends people back here with `credentials_id` and our `state` (every plan), or `error=…` when they backed
 * out (no API call then). The callback sends `{state, credentialsId}` and moves on: to the reading screen, or to
 * the bank's page after a renewal.
 */
export default function CallbackScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const callback = useBankCallback();
  const handled = useRef(false);

  useEffect(() => {
    // The state is single use, so this must run once even when effects run twice in development.
    if (handled.current) return;
    handled.current = true;

    const back = takeTinkReturn();
    const renewing = back?.kind === "renew" ? back.bankId : null;
    const another = back?.kind === "connect" && back.another;
    const state = params.get("state");
    const credentialsId = params.get("credentials_id");

    if (params.get("error") || !state || !credentialsId) {
      if (renewing) router.replace(`/home/settings/banks/${renewing}`);
      else router.replace(another ? "/connect/cancelled?another=1" : "/connect/cancelled");
      return;
    }

    callback.mutate(
      { state, credentialsId },
      {
        onSuccess: ({ connectionId }) => {
          if (renewing) router.replace(`/home/settings/banks/${renewing}?renewed=1`);
          else router.replace(`/connect/reading?connection=${encodeURIComponent(connectionId)}${another ? "&another=1" : ""}`);
        },
        onError: (error) => {
          const reason = isApiError(error) && error.code === "BANK_ALREADY_CONNECTED" ? "already" : isApiError(error) && error.isLimit ? "limit" : "failed";
          if (renewing) router.replace(`/home/settings/banks/${renewing}?problem=${reason}`);
          else router.replace(`/connect/cancelled?reason=${reason}${another ? "&another=1" : ""}`);
        },
      },
    );
  }, [callback, params, router]);

  return (
    <OnboardingCard>
      <ScreenTitle className="mb-7">Connecting</ScreenTitle>
      <div className="flex justify-center">
        <Spinner className="text-ink-soft" />
      </div>
    </OnboardingCard>
  );
}
