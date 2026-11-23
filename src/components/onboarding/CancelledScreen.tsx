"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { BankIcon, CloseIcon } from "@/components/ui/icons";
import IconBadge, { BADGE_ICON } from "@/components/ui/onboarding/IconBadge";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import ScreenTitle, { ScreenLead } from "@/components/ui/onboarding/ScreenTitle";

/**
 * 10: the person backed out at the bank, or the callback didn't check out (BANK_LINK_FAILED reuses this).
 * `?reason=already`: "This bank is already connected." with a way back to the bank list, no retry.
 */
export default function CancelledScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const another = params.get("another") === "1";
  const reason = params.get("reason");
  const pickerHref = another ? "/connect/bank?another=1" : "/connect/bank";

  useEffect(() => {
    router.prefetch(pickerHref);
  }, [pickerHref, router]);

  if (reason === "already") {
    return (
      <OnboardingCard>
        <IconBadge>
          <BankIcon size={BADGE_ICON} />
        </IconBadge>
        <ScreenTitle className="mb-2">This bank is already connected.</ScreenTitle>
        <ScreenLead className="mb-[34px]">It’s in your banks already, so there’s nothing more to do here.</ScreenLead>
        <Button href={another ? "/found" : "/home/settings"} name="cancelled-banks" variant="inkDeep" size="block">
          {another ? "Back to what we found" : "See your banks"}
        </Button>
      </OnboardingCard>
    );
  }

  return (
    <OnboardingCard>
      <IconBadge tone="alert">
        <CloseIcon size={BADGE_ICON} />
      </IconBadge>
      <ScreenTitle className="mb-[34px]">Connection cancelled</ScreenTitle>
      <Button variant="inkDeep" size="block" onClick={() => router.push(pickerHref)}>
        Try again
      </Button>
      {another && (
        <QuietLink href="/found" className="mt-4">
          Back to what we found
        </QuietLink>
      )}
    </OnboardingCard>
  );
}
