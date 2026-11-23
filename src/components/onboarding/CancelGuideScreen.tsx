"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import FormMessage from "@/components/ui/FormMessage";
import { CheckIcon } from "@/components/ui/icons";
import Monogram from "@/components/ui/onboarding/Monogram";
import { useReveal } from "@/components/ui/onboarding/Motion";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import ScreenTitle, { ScreenLead } from "@/components/ui/onboarding/ScreenTitle";
import { FindingListSkeleton } from "@/components/ui/onboarding/Skeletons";
import { errorCopy } from "@/lib/api/errors";
import { duration } from "@/lib/motion";
import { formatMoney } from "@/lib/money";
import { planFor, usePlans } from "@/lib/onboarding/plans";
import { useCancelGuide, useFlag, useMarkFindCancelled } from "@/store/flags";
import { guideHref } from "./LookScreen";

/** 21: how to cancel one thing, "1 of N" across everything being cancelled from this flag. */
export default function CancelGuideScreen({ flagId, findingId }: { flagId: string; findingId: string }) {
  const router = useRouter();
  const flag = useFlag(flagId);
  const plans = usePlans();
  const markCancelled = useMarkFindCancelled();
  const finding = flag.data?.items.find((candidate) => candidate.id === findingId) ?? null;
  const guide = useCancelGuide(finding?.guide ?? null);
  const [done, setDone] = useState(false);
  const reveal = useReveal();

  const plan = flag.data ? planFor(plans, flag.data) : [];
  const sequence = plan.includes(findingId) ? plan : [findingId];
  const position = sequence.indexOf(findingId);
  const nextToCancel = sequence.slice(position + 1).find((id) => !flag.data?.items.find((item) => item.id === id)?.cancelled);
  const afterHref = nextToCancel ? guideHref(flagId, nextToCancel) : "/found";

  useEffect(() => {
    router.prefetch(afterHref);
    router.prefetch("/found");
  }, [afterHref, router]);

  useEffect(() => {
    if (flag.isError || (flag.data && flag.data.items.length > 0 && !finding)) router.replace("/found");
  }, [finding, flag.data, flag.isError, router]);

  if (!finding || (finding.guide && guide.isPending)) {
    return (
      <OnboardingCard>
        <FindingListSkeleton rows={3} />
      </OnboardingCard>
    );
  }

  const merchant = guide.data?.merchant ?? finding.provider ?? finding.name;

  // Shows the check for a beat, then moves on.
  function cancelled() {
    if (done || markCancelled.isPending) return;
    markCancelled.mutate(findingId, {
      onSuccess: () => {
        setDone(true);
        setTimeout(() => router.push(afterHref), duration.slow * 1000);
      },
    });
  }

  return (
    <OnboardingCard>
      <p className="mb-2 text-center text-[13px] text-ink-soft">
        {position + 1} of {sequence.length}
      </p>
      <div className="mb-5 flex justify-center">
        <Monogram letters={finding.monogram} size="lg" />
      </div>
      <ScreenTitle className="mb-2">Cancel {merchant}</ScreenTitle>
      {finding.monthly && (
        <ScreenLead className="mb-8">Saves {formatMoney({ minor: finding.monthly.minor * 12, currency: finding.monthly.currency })} a year</ScreenLead>
      )}
      {guide.data ? (
        <>
          <ol className="mb-8 border-t border-line">
            {guide.data.steps.map((step, index) => (
              <li key={step} className="flex items-center gap-3.5 border-b border-line py-4 last:border-b-0">
                <span className="flex size-7 flex-none items-center justify-center rounded-full bg-mist text-[13px] font-semibold text-ink-deep">
                  {index + 1}
                </span>
                <span className="text-[15px] text-ink">{step}</span>
              </li>
            ))}
          </ol>
          <p className="-mt-3 mb-7 flex items-center justify-center gap-[7px] text-center text-[13px] text-ink-soft">
            <CheckIcon size={15} strokeWidth={2.4} className="text-positive" />
            {guide.data.note}
          </p>
          <Button variant="inkDeep" size="block" onClick={() => window.open(guide.data!.url, "_blank", "noopener,noreferrer")}>
            Open {guide.data.merchant}
          </Button>
        </>
      ) : (
        <ScreenLead className="mb-8">Sign in to {merchant} and look for your account or membership settings.</ScreenLead>
      )}
      <QuietLink onClick={cancelled} className="mt-[18px]">
        <span className="relative">
          {done && (
            <span aria-hidden="true" className="absolute top-1/2 right-full mr-1.5 flex -translate-y-1/2">
              <motion.span {...reveal.pop()} className="flex text-positive">
                <CheckIcon size={15} strokeWidth={2.4} />
              </motion.span>
            </span>
          )}
          I’ve cancelled it
        </span>
      </QuietLink>
      <FormMessage message={markCancelled.isError ? errorCopy(markCancelled.error) : null} gapClassName="pt-3" />
    </OnboardingCard>
  );
}
