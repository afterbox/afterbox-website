"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { goBack } from "@/components/ui/BackButton";
import Button from "@/components/ui/Button";
import { FlagIcon } from "@/components/ui/icons";
import IconBadge, { BADGE_ICON } from "@/components/ui/onboarding/IconBadge";
import KeepCancel from "@/components/ui/onboarding/KeepCancel";
import { AnimatedNumber } from "@/components/ui/onboarding/Motion";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import SavingBox from "@/components/ui/onboarding/SavingBox";
import ScreenTitle, { ScreenLead } from "@/components/ui/onboarding/ScreenTitle";
import { formatMoney, formatMonth, sum, yearly } from "@/lib/onboarding/format";
import type { Flag, FlagId } from "@/lib/onboarding/mock";
import { monthlySaving, planFor, useFindings, useOnboarding } from "@/lib/onboarding/store";
import FindingRow from "./FindingRow";

export const guideHref = (flagId: string, findingId: string) => `/found/look/${flagId}/cancel/${findingId}`;

const allOf = (count: number) =>
  count === 2 ? "both" : `all ${["three", "four", "five", "six"][count - 3] ?? count}`;

/** Worth a look: 19 for two of the same policy, 20 for overlapping services. */
export default function LookScreen({ flagId }: { flagId: FlagId }) {
  const router = useRouter();
  const { state, actions } = useOnboarding();
  const { flags, isCancelled } = useFindings();
  const current = flags.find((flag) => flag.id === flagId) ?? null;
  // Keeps the screen drawn while it leaves after the flag is dismissed.
  const [flag, setFlag] = useState<Flag | null>(current);
  if (current && current !== flag) setFlag(current);
  const leaving = useRef(false);

  useEffect(() => {
    if (!current && !leaving.current) router.replace("/found");
  }, [current, router]);

  if (!flag) return null;

  const plan = planFor(flag, state);

  function dismiss() {
    leaving.current = true;
    actions.dismissFlag(flag!.id);
    goBack(router, "/found");
  }

  if (flag.id === "home-insurance") {
    return (
      <OnboardingCard>
        <IconBadge tone="warn">
          <FlagIcon size={BADGE_ICON} />
        </IconBadge>
        <ScreenTitle className="mb-2">{flag.title}</ScreenTitle>
        <ScreenLead className="mb-8">{flag.lead}</ScreenLead>
        <ul className="mb-8 border-t border-line">
          {flag.items.map((item) => (
            <FindingRow
              key={item.id}
              finding={item}
              title={item.provider}
              detail={`${item.name} · since ${formatMonth(item.since)}`}
              cancelled={isCancelled(item.id)}
              className="border-b py-4 last:border-b-0"
            />
          ))}
        </ul>
        <SavingBox
          label="If you cancel one"
          perYear={yearly(monthlySaving(flag, plan))}
          note="Check for a cancellation fee first"
        />
        <Button href={guideHref(flag.id, plan[0])} variant="inkDeep" size="block">
          Show me how to cancel
        </Button>
        <QuietLink onClick={dismiss} className="mt-[18px]">
          They cover different homes
        </QuietLink>
      </OnboardingCard>
    );
  }

  const toCancel = flag.items.filter((item) => plan.includes(item.id) && !isCancelled(item.id));
  const monthly = sum(toCancel.map((item) => item.monthly));

  function choose(id: string, cancel: boolean) {
    const others = plan.filter((planned) => planned !== id);
    actions.setPlan(flag!.id, cancel ? [...others, id] : others);
  }

  return (
    <OnboardingCard>
      <IconBadge tone="warn">
        <FlagIcon size={BADGE_ICON} />
      </IconBadge>
      <ScreenTitle className="mb-2">{flag.title}</ScreenTitle>
      <ScreenLead className="mb-8">{flag.lead}</ScreenLead>
      <ul className="mb-8 border-t border-line">
        {flag.items.map((item) => (
          <FindingRow
            key={item.id}
            finding={item}
            title={item.provider}
            detail={`${formatMoney(item.monthly)} a month`}
            cancelled={isCancelled(item.id)}
            dimmed={plan.includes(item.id) && !isCancelled(item.id)}
            className="border-b py-4 last:border-b-0"
            action={
              <KeepCancel
                id={item.id}
                name={item.provider}
                cancel={plan.includes(item.id)}
                onChange={(cancel) => choose(item.id, cancel)}
              />
            }
          />
        ))}
      </ul>
      <SavingBox label={`Cancel ${toCancel.length}`} perYear={yearly(monthly)} note={`${formatMoney(monthly)} a month`} />
      <Button
        variant="inkDeep"
        size="block"
        disabled={toCancel.length === 0}
        onClick={() => router.push(guideHref(flag.id, toCancel[0].id))}
      >
        Show me how to cancel <AnimatedNumber value={toCancel.length} />
      </Button>
      <QuietLink onClick={dismiss} className="mt-[18px]">
        I use {allOf(flag.items.length)}
      </QuietLink>
    </OnboardingCard>
  );
}
