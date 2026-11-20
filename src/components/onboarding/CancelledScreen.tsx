"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/icons";
import IconBadge, { BADGE_ICON } from "@/components/ui/onboarding/IconBadge";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import ScreenTitle from "@/components/ui/onboarding/ScreenTitle";
import { useOnboarding } from "@/lib/onboarding/store";

/** 10: the person backed out at the bank, or the callback didn't check out. */
export default function CancelledScreen() {
  const router = useRouter();
  const { state, actions } = useOnboarding();
  const pending = state.pending;

  useEffect(() => {
    router.prefetch("/connect/opening");
    router.prefetch("/connect/bank");
  }, [router]);

  function retry() {
    if (pending) {
      actions.chooseBank(pending.bankId, pending.another);
      router.push("/connect/opening");
    } else {
      router.push("/connect/bank");
    }
  }

  return (
    <OnboardingCard>
      <IconBadge tone="alert">
        <CloseIcon size={BADGE_ICON} />
      </IconBadge>
      <ScreenTitle className="mb-[34px]">Connection cancelled</ScreenTitle>
      <Button variant="inkDeep" size="block" onClick={retry}>
        Try again
      </Button>
      <QuietLink href={pending?.another ? "/connect/bank?another=1" : "/connect/bank"} className="mt-4">
        Choose another bank
      </QuietLink>
    </OnboardingCard>
  );
}
