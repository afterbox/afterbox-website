"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
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
import { FindingListSkeleton } from "@/components/ui/onboarding/Skeletons";
import type { Finding, FlagDetail, Money } from "@/lib/api/types";
import { formatSince } from "@/lib/dashboard/format";
import { formatMoney } from "@/lib/money";
import { planFor, setPlan, usePlans } from "@/lib/onboarding/plans";
import { useDismissFlag, useFlag } from "@/store/flags";
import FindingRow from "./FindingRow";

export const guideHref = (flagId: string, findingId: string) => `/found/look/${flagId}/cancel/${findingId}`;

const allOf = (count: number) => (count === 2 ? "both" : `all ${["three", "four", "five", "six"][count - 3] ?? count}`);

/** One currency per flag: what cancelling `items` saves a month and a year. */
function savingOf(items: Finding[], currency: string): { monthly: Money; yearly: Money } {
  const minor = items.reduce((sum, item) => sum + (item.monthly?.minor ?? 0), 0);
  return { monthly: { minor, currency }, yearly: { minor: minor * 12, currency } };
}

/** What "Leave it" says for each kind of flag. */
const keepCopy: Record<FlagDetail["type"], (count: number) => string> = {
  same_thing_twice: () => "They cover different things",
  both_banks: () => "They’re different things",
  overlap: (count) => `I use ${allOf(count)}`,
  price_rise: () => "I’m happy with the price",
  trial_turned_paid: () => "I want to keep it",
};

/**
 * Worth a look. `overlap` lets the member choose what to keep (20); `same_thing_twice` and `both_banks` suggest
 * cancelling one (19); `price_rise` and `trial_turned_paid`, which had no design, reuse 19's calm layout.
 */
export default function LookScreen({ flagId }: { flagId: string }) {
  const router = useRouter();
  const query = useFlag(flagId);
  const dismiss = useDismissFlag();
  const plans = usePlans();
  const leaving = useRef(false);
  const flag = query.data;
  const items = flag?.items ?? [];
  const plan = flag ? planFor(plans, flag) : [];
  const live = items.filter((item) => !item.cancelled);
  const toCancel = live.filter((item) => plan.includes(item.id));
  const firstToCancel = toCancel.find((item) => item.guide)?.id ?? toCancel[0]?.id;

  useEffect(() => {
    router.prefetch("/found");
  }, [router]);

  useEffect(() => {
    if (flag && firstToCancel) router.prefetch(guideHref(flag.id, firstToCancel));
  }, [flag, firstToCancel, router]);

  useEffect(() => {
    if (query.isError && !leaving.current) router.replace("/found");
  }, [query.isError, router]);

  if (!flag || items.length === 0) {
    return (
      <OnboardingCard>
        <FindingListSkeleton rows={2} />
      </OnboardingCard>
    );
  }

  function leave() {
    leaving.current = true;
    dismiss.mutate(flagId);
    goBack(router, "/found");
  }

  const currency = flag.saving.monthly.currency;
  const header = (
    <>
      <IconBadge tone="warn">
        <FlagIcon size={BADGE_ICON} />
      </IconBadge>
      <ScreenTitle className="mb-2">{flag.title}</ScreenTitle>
      <ScreenLead className="mb-8">{flag.lead}</ScreenLead>
    </>
  );

  if (flag.type === "overlap") {
    const saving = savingOf(toCancel, currency);
    const choose = (id: string, cancel: boolean) => {
      const others = plan.filter((planned) => planned !== id);
      setPlan(flag.id, cancel ? [...others, id] : others);
    };
    return (
      <OnboardingCard>
        {header}
        <ul className="mb-8 border-t border-line">
          {items.map((item) => (
            <FindingRow
              key={item.id}
              finding={item}
              title={item.provider ?? item.name}
              detail={item.monthly ? `${formatMoney(item.monthly)} a month` : item.name}
              dimmed={plan.includes(item.id) && !item.cancelled}
              className="border-b py-4 last:border-b-0"
              action={
                <KeepCancel id={item.id} name={item.provider ?? item.name} cancel={plan.includes(item.id)} onChange={(cancel) => choose(item.id, cancel)} />
              }
            />
          ))}
        </ul>
        <SavingBox label={`Cancel ${toCancel.length} and you save`} perYear={saving.yearly} note={`That’s ${formatMoney(saving.monthly)} a month`} />
        <Button variant="inkDeep" size="block" disabled={toCancel.length === 0} onClick={() => firstToCancel && router.push(guideHref(flag.id, firstToCancel))}>
          Show me how to cancel <AnimatedNumber value={toCancel.length} />
        </Button>
        <QuietLink onClick={leave} className="mt-[18px]">
          {keepCopy.overlap(items.length)}
        </QuietLink>
      </OnboardingCard>
    );
  }

  return (
    <OnboardingCard>
      {header}
      <ul className="mb-8 border-t border-line">
        {items.map((item) => (
          <FindingRow
            key={item.id}
            finding={item}
            title={item.provider ?? item.name}
            detail={[item.name, item.since ? `since ${formatSince(item.since)}` : null, item.bankName].filter(Boolean).join(" · ")}
            className="border-b py-4 last:border-b-0"
          />
        ))}
      </ul>
      <SavingBox
        label={toCancel.length === 1 && live.length > 1 ? "Cancel one and you save" : "Cancel it and you save"}
        perYear={flag.saving.yearly}
        note={flag.type === "same_thing_twice" || flag.type === "both_banks" ? "Check for a cancellation fee first" : `That’s ${formatMoney(flag.saving.monthly)} a month`}
      />
      {firstToCancel && (
        <Button href={guideHref(flag.id, firstToCancel)} name="look-cancel-guide" variant="inkDeep" size="block">
          Show me how to cancel
        </Button>
      )}
      <QuietLink onClick={leave} className="mt-[18px]">
        {keepCopy[flag.type](items.length)}
      </QuietLink>
    </OnboardingCard>
  );
}
