"use client";

import { motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BrandMark from "@/components/ui/BrandMark";
import Button from "@/components/ui/Button";
import { AlertIcon, LockIcon } from "@/components/ui/icons";
import IconBadge, { BADGE_ICON } from "@/components/ui/onboarding/IconBadge";
import Monogram from "@/components/ui/onboarding/Monogram";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import ScreenTitle, { ScreenLead } from "@/components/ui/onboarding/ScreenTitle";
import Spinner from "@/components/ui/Spinner";
import { errorCopy, isApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/dashboard/format";
import { duration, stagger, transition } from "@/lib/motion";
import { useLinkBank } from "@/store/banks";

const HANDOFF_DELAY = 800;

/** The dots' resting opacities, fading towards the bank; each brightens in turn. */
const dots = [0.25, 0.5, 0.85];

function problemCopy(error: unknown) {
  if (isApiError(error) && error.code === "LIMIT_BANKS") {
    return error.details.rescanAfter
      ? `Your plan reads one bank. You can read it again from ${formatDate(error.details.rescanAfter)}.`
      : "Your plan has room for one bank.";
  }
  return errorCopy(error);
}

/** 05: a short beat naming the bank while the backend builds the Tink Link, then off to Tink. */
export default function OpeningScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const providerId = params.get("provider") ?? undefined;
  const name = params.get("name");
  const another = params.get("another") === "1";
  const pickerHref = another ? "/connect/bank?another=1" : "/connect/bank";
  const link = useLinkBank();
  const started = useRef(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    router.prefetch(pickerHref);
  }, [pickerHref, router]);

  const { mutate } = link;
  const [url, setUrl] = useState<string | null>(null);
  const shownAt = useRef(0);

  // Ask the backend for the Tink Link once per attempt (it makes a single-use state).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    shownAt.current = Date.now();
    mutate({ providerId, another }, { onSuccess: setUrl });
  }, [attempt, another, mutate, providerId]);

  // A short beat naming the bank, then off to Tink.
  useEffect(() => {
    if (!url) return;
    const timer = setTimeout(() => window.location.assign(url), Math.max(0, HANDOFF_DELAY - (Date.now() - shownAt.current)));
    return () => clearTimeout(timer);
  }, [url]);

  // Coming Back from Tink can restore this page from the back/forward cache, mid-handoff.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) router.replace(pickerHref);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [pickerHref, router]);

  if (link.isError) {
    return (
      <OnboardingCard>
        <IconBadge tone="alert">
          <AlertIcon size={BADGE_ICON} />
        </IconBadge>
        <ScreenTitle className="mb-2">{name ? `${name} didn’t open` : "Your bank didn’t open"}</ScreenTitle>
        <ScreenLead className="mb-[34px]">{problemCopy(link.error)}</ScreenLead>
        {!(isApiError(link.error) && link.error.isLimit) && (
          <Button
            variant="inkDeep"
            size="block"
            onClick={() => {
              started.current = false;
              link.reset();
              setAttempt((count) => count + 1);
            }}
          >
            Try again
          </Button>
        )}
        <QuietLink href={another || (isApiError(link.error) && link.error.isLimit) ? "/found" : pickerHref} className="mt-4">
          {isApiError(link.error) && link.error.isLimit ? "Back to what we found" : "Choose another bank"}
        </QuietLink>
      </OnboardingCard>
    );
  }

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
        <Monogram letters={(name ?? "B").charAt(0).toUpperCase()} size="md" />
      </div>
      <ScreenTitle className="mb-2.5">{name ? `Opening ${name}` : "Opening your bank"}</ScreenTitle>
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
