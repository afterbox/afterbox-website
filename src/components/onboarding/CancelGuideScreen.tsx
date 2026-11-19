"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import Monogram from "@/components/ui/onboarding/Monogram";
import { useReveal } from "@/components/ui/onboarding/Motion";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import ScreenTitle, { ScreenLead } from "@/components/ui/onboarding/ScreenTitle";
import { duration } from "@/lib/motion";
import { formatMoney, yearly } from "@/lib/onboarding/format";
import { getCancelGuide, getFlags, type FlagId } from "@/lib/onboarding/mock";
import { planFor, useFindings, useOnboarding } from "@/lib/onboarding/store";
import { guideHref } from "./LookScreen";

/** 21: how to cancel one service, "1 of N" across everything being cancelled from this flag. */
export default function CancelGuideScreen({ flagId, merchant }: { flagId: FlagId; merchant: string }) {
  const router = useRouter();
  const { state, actions } = useOnboarding();
  const { findings, isCancelled } = useFindings();
  // All flags, not just open ones: the last "I've cancelled it" closes the flag while still here.
  const flag = getFlags(findings).find((candidate) => candidate.id === flagId);
  const plan = flag ? planFor(flag, state) : [];
  const sequence = plan.includes(merchant) ? plan : [merchant];
  const position = sequence.indexOf(merchant);
  const guide = getCancelGuide(merchant);
  const finding = findings.find((candidate) => candidate.id === merchant);
  const [done, setDone] = useState(false);
  const reveal = useReveal();

  useEffect(() => {
    if (!guide || !finding) router.replace("/found");
  }, [guide, finding, router]);

  if (!guide || !finding) return null;

  // Shows the check for a beat, then moves on.
  function cancelled() {
    if (done) return;
    setDone(true);
    const next = sequence.slice(position + 1).find((id) => !isCancelled(id));
    setTimeout(() => {
      actions.markCancelled(merchant);
      router.push(next ? guideHref(flagId, next) : "/found");
    }, duration.slow * 1000);
  }

  return (
    <OnboardingCard>
      <p className="mb-2 text-center text-[13px] text-ink-soft">
        {position + 1} of {sequence.length}
      </p>
      <div className="mb-5 flex justify-center">
        <Monogram letters={finding.monogram} size="lg" />
      </div>
      <ScreenTitle className="mb-2">Cancel {guide.merchant}</ScreenTitle>
      <ScreenLead className="mb-8">Saves {formatMoney(yearly(finding.monthly))} a year</ScreenLead>
      <ol className="mb-8 border-t border-line">
        {guide.steps.map((step, index) => (
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
        {guide.note}
      </p>
      <Button variant="inkDeep" size="block" onClick={() => window.open(guide.url, "_blank", "noopener,noreferrer")}>
        Open {guide.merchant}
      </Button>
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
    </OnboardingCard>
  );
}
