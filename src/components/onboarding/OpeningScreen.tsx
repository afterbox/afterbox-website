"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import BrandMark from "@/components/ui/BrandMark";
import { LockIcon } from "@/components/ui/icons";
import Monogram from "@/components/ui/onboarding/Monogram";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import ScreenTitle from "@/components/ui/onboarding/ScreenTitle";
import Spinner from "@/components/ui/Spinner";
import { duration, stagger, transition } from "@/lib/motion";
import { getBank } from "@/lib/onboarding/mock";
import { useOnboarding } from "@/lib/onboarding/store";
import { buildTinkLinkUrl } from "@/lib/onboarding/tink";

const HANDOFF_DELAY = 800;

/** The dots' resting opacities, fading towards the bank; each brightens in turn. */
const dots = [0.25, 0.5, 0.85];

/** 05: a short beat naming the bank, then off to Tink Link. */
export default function OpeningScreen() {
  const router = useRouter();
  const { state } = useOnboarding();
  const bank = getBank(state.pending?.bankId);
  const pickerHref = state.pending?.another ? "/connect/bank?another=1" : "/connect/bank";

  useEffect(() => {
    if (!bank) {
      router.replace(pickerHref);
      return;
    }
    const timer = setTimeout(() => window.location.assign(buildTinkLinkUrl()), HANDOFF_DELAY);
    // Coming Back from Tink can restore this page from the back/forward cache, mid-handoff.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) router.replace(pickerHref);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [bank, pickerHref, router]);

  if (!bank) return null;

  return (
    <OnboardingCard>
      <div aria-hidden="true" className="mt-2 mb-6 flex items-center justify-center gap-3.5">
        <BrandMark className="block size-12" />
        <span className="flex gap-[5px]">
          {dots.map((opacity, index) => (
            <motion.span
              key={opacity}
              className="size-[5px] rounded-full bg-ink-deep"
              initial={{ opacity }}
              animate={{ opacity: [opacity, 1, opacity] }}
              transition={{ ...transition("slow", index * stagger.hook), repeat: Infinity, repeatDelay: duration.base }}
            />
          ))}
        </span>
        <Monogram letters={bank.monogram} size="md" />
      </div>
      <ScreenTitle className="mb-2.5">Opening {bank.name}</ScreenTitle>
      <p className="mb-7 flex items-center justify-center gap-[7px] text-sm/[normal] text-ink-soft">
        <LockIcon size={14} />
        Secure connection
      </p>
      <div className="flex justify-center">
        <Spinner className="text-ink-soft" />
      </div>
    </OnboardingCard>
  );
}
