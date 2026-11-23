"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { AlertIcon, BankIcon } from "@/components/ui/icons";
import IconBadge, { BADGE_ICON } from "@/components/ui/onboarding/IconBadge";
import { useReveal } from "@/components/ui/onboarding/Motion";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import ReadingSteps, { stepHint, stepLabel, stepStatuses } from "@/components/ui/onboarding/ReadingSteps";
import ScreenTitle, { ScreenLead } from "@/components/ui/onboarding/ScreenTitle";
import { Busy } from "@/components/ui/onboarding/Skeletons";
import { Sk } from "@/components/ui/dashboard/Skeleton";
import { errorCopy } from "@/lib/api/errors";
import type { Progress, ReadStep } from "@/lib/api/types";
import { transition } from "@/lib/motion";
import { useQueryClient } from "@tanstack/react-query";
import { useProgress, useRenewBank } from "@/store/banks";
import { invalidateFound } from "@/store/queryKeys";

/** A beat on the last tick before moving on. */
const FINISH_PAUSE = 400;

const placeholder: Progress = {
  bankName: null,
  steps: (["accounts", "transactions", "sorting"] as ReadStep[]).map((id) => ({ id, done: false })),
  chips: [],
  status: "reading",
  reason: null,
  another: false,
};

function Failed({ progress, connectionId, another }: { progress: Progress; connectionId: string; another: boolean }) {
  const renew = useRenewBank();
  const bank = progress.bankName ?? "that bank";
  if (progress.reason === "already_connected") {
    return (
      <OnboardingCard>
        <IconBadge>
          <BankIcon size={BADGE_ICON} />
        </IconBadge>
        <ScreenTitle className="mb-2">This bank is already connected.</ScreenTitle>
        <ScreenLead className="mb-[34px]">It’s in your banks already, so there’s nothing more to do here.</ScreenLead>
        <Button href={another ? "/found" : "/home/settings"} name="reading-banks" variant="inkDeep" size="block">
          {another ? "Back to what we found" : "See your banks"}
        </Button>
      </OnboardingCard>
    );
  }
  const title = progress.reason === "no_accounts" ? `We couldn’t see any accounts at ${bank}.` : `${progress.bankName ?? "That bank"} didn’t connect`;
  return (
    <OnboardingCard>
      <IconBadge tone="alert">
        <AlertIcon size={BADGE_ICON} />
      </IconBadge>
      <ScreenTitle className="mb-2">{title}</ScreenTitle>
      <ScreenLead className="mb-[34px]">{renew.isError ? errorCopy(renew.error) : "Try again, or choose another bank."}</ScreenLead>
      <Button
        variant="inkDeep"
        size="block"
        loading={renew.isPending || renew.isSuccess}
        loadingLabel="Opening your bank"
        onClick={() => renew.mutate(connectionId, { onSuccess: (url) => window.location.assign(url) })}
      >
        Try again
      </Button>
      <QuietLink href={another ? "/connect/bank?another=1" : "/connect/bank"} className="mt-4">
        Choose another bank
      </QuietLink>
    </OnboardingCard>
  );
}

/** 06 and 07, or 16 for a second bank. Pushed by `scan.progress` over Ably; the route is polled as a fallback. */
export default function ReadingScreen() {
  const router = useRouter();
  const params = useSearchParams();
  // Kept from the first render: while this screen fades out, the params already belong to the next one.
  const [{ connectionId, anotherParam }] = useState(() => ({ connectionId: params.get("connection"), anotherParam: params.get("another") === "1" }));
  const query = useProgress(connectionId);
  const progress = query.data ?? placeholder;
  const another = anotherParam || progress.another;
  const reveal = useReveal();
  const done = progress.status === "done";
  const next = done && progress.reason === "few_transactions" ? `/connect/thin${another ? "?another=1" : ""}` : "/found";

  useEffect(() => {
    router.prefetch("/found");
    router.prefetch("/connect/thin");
  }, [router]);

  useEffect(() => {
    if (!connectionId) router.replace("/connect/bank");
  }, [connectionId, router]);

  const client = useQueryClient();
  useEffect(() => {
    if (!done) return;
    // What was found moves on the server as the read finishes: start the found screen from fresh data.
    invalidateFound(client);
    const timer = setTimeout(() => router.replace(next), FINISH_PAUSE);
    return () => clearTimeout(timer);
  }, [client, done, next, router]);

  if (!connectionId) return null;
  if (query.data?.status === "failed") return <Failed progress={query.data} connectionId={connectionId} another={another} />;

  if (query.isError) {
    return (
      <OnboardingCard>
        <IconBadge tone="alert">
          <AlertIcon size={BADGE_ICON} />
        </IconBadge>
        <ScreenTitle className="mb-2">We lost track of that read</ScreenTitle>
        <ScreenLead className="mb-[34px]">{errorCopy(query.error)}</ScreenLead>
        <Button variant="inkDeep" size="block" onClick={() => query.refetch()}>
          Try again
        </Button>
      </OnboardingCard>
    );
  }

  const statuses = stepStatuses(progress);
  const runningIndex = statuses.indexOf("running");
  const current = progress.steps[runningIndex === -1 ? progress.steps.length - 1 : runningIndex].id;
  const title = progress.bankName ? `Reading ${progress.bankName}` : another ? "Reading your bank" : "Reading your accounts";

  return (
    <OnboardingCard>
      <ScreenTitle className="mb-[30px]">{title}</ScreenTitle>
      {query.isPending ? (
        <Busy>
          <div className="border-t border-line">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex items-center gap-3 border-b border-line py-[18px]">
                <Sk className="size-8 flex-none" />
                <Sk className="h-3.5 flex-1" />
                <Sk round className="size-4 flex-none" />
              </div>
            ))}
          </div>
        </Busy>
      ) : (
        <ReadingSteps progress={progress} another={another} />
      )}
      <p className="mt-7 grid text-center text-[13px] text-ink-soft *:col-start-1 *:row-start-1">
        <AnimatePresence initial={false}>
          <motion.span key={done ? "done" : current} {...reveal.fade()} exit={{ opacity: 0, transition: transition("fast") }}>
            {done ? "Done" : stepHint(current)}
          </motion.span>
        </AnimatePresence>
      </p>
      <p role="status" className="sr-only">
        {done ? "Finished reading" : stepLabel(current, another)}
      </p>
    </OnboardingCard>
  );
}
