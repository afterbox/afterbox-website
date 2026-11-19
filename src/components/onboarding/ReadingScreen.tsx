"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import ReadingSteps, { stepStatus } from "@/components/ui/onboarding/ReadingSteps";
import { useReveal } from "@/components/ui/onboarding/Motion";
import ScreenTitle from "@/components/ui/onboarding/ScreenTitle";
import { transition } from "@/lib/motion";
import { getBank, getReadingSteps } from "@/lib/onboarding/mock";
import { useOnboarding } from "@/lib/onboarding/store";

/** A beat on the last tick before moving on. */
const FINISH_PAUSE = 400;

/** 06 and 07, or 16 for a second bank. Mock timers stand in for Tink webhooks. */
export default function ReadingScreen() {
  const router = useRouter();
  const { state } = useOnboarding();
  const bank = getBank(state.banks.at(-1)?.id);
  const another = state.banks.length > 1;
  const steps = useMemo(() => getReadingSteps(another), [another]);
  const next = !another && state.scenario === "thin" ? "/connect/thin" : "/found";
  const [elapsed, setElapsed] = useState(0);
  const reveal = useReveal();

  useEffect(() => {
    if (!bank) {
      router.replace("/connect/bank");
      return;
    }
    const moments = new Set(steps.flatMap((step) => [step.doneAt, ...(step.chips ?? []).map((chip) => chip.at)]));
    const timers = [...moments].map((at) => setTimeout(() => setElapsed((current) => Math.max(current, at)), at));
    timers.push(setTimeout(() => router.replace(next), steps[steps.length - 1].doneAt + FINISH_PAUSE));
    return () => timers.forEach(clearTimeout);
  }, [bank, steps, next, router]);

  if (!bank) return null;

  const current = steps.find((_, index) => stepStatus(steps, index, elapsed) === "running") ?? steps[steps.length - 1];

  return (
    <OnboardingCard>
      <ScreenTitle className="mb-[30px]">{another ? `Reading ${bank.name}` : "Reading your accounts"}</ScreenTitle>
      <ReadingSteps steps={steps} elapsed={elapsed} />
      <p className="mt-7 grid text-center text-[13px] text-ink-soft *:col-start-1 *:row-start-1">
        <AnimatePresence initial={false}>
          <motion.span key={current.hint} {...reveal.fade()} exit={{ opacity: 0, transition: transition("fast") }}>
            {current.hint}
          </motion.span>
        </AnimatePresence>
      </p>
      <p role="status" className="sr-only">
        {current.label}
      </p>
    </OnboardingCard>
  );
}
