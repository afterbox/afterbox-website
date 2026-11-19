"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { FlagIcon } from "@/components/ui/icons";
import IconSquare, { CategoryGlyph } from "@/components/ui/onboarding/IconSquare";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import { formatMoney, formatMonth, sum } from "@/lib/onboarding/format";
import { getCategory, type CategoryId } from "@/lib/onboarding/mock";
import { useFindings } from "@/lib/onboarding/store";
import FindingRow from "./FindingRow";

/** 09: everything in one category. */
export default function CategoryScreen({ categoryId }: { categoryId: CategoryId }) {
  const router = useRouter();
  const { findings, flags, isCancelled } = useFindings();
  const category = getCategory(categoryId);
  const items = findings.filter((finding) => finding.category === categoryId);

  useEffect(() => {
    if (!category || items.length === 0) router.replace("/found");
  }, [category, items.length, router]);

  if (!category || items.length === 0) return null;

  const flagFor = (id: string) => flags.find((flag) => flag.items.some((item) => item.id === id));
  const monthly = sum(items.filter((item) => !isCancelled(item.id)).map((item) => item.monthly));
  const [singular, plural] = category.unit;

  return (
    <OnboardingCard size="category">
      <div className="mb-1.5 flex items-center gap-3">
        <IconSquare size="lg">
          <CategoryGlyph icon={category.icon} size={20} />
        </IconSquare>
        <div>
          <h1 tabIndex={-1} className="text-[24px]/[1.1] font-normal tracking-[-0.03em] text-ink outline-none sm:text-[28px]/[1.1]">
            {category.label}
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {items.length} {items.length === 1 ? singular : plural} · {formatMoney(monthly)} a month
          </p>
        </div>
      </div>

      <ul className="mt-[26px] mb-[34px] border-t border-line">
        {items.map((item) => {
          const flag = flagFor(item.id);
          return (
            <FindingRow
              key={item.id}
              finding={item}
              title={item.name}
              detail={`${item.provider} · Since ${formatMonth(item.since)}`}
              cancelled={isCancelled(item.id)}
              className="border-b py-[17px]"
              note={
                flag && (
                  <span className="mt-1 inline-flex items-center gap-1 text-xs/[normal] font-semibold text-warn">
                    <FlagIcon size={12} />
                    {flag.itemNote}
                  </span>
                )
              }
            />
          );
        })}
      </ul>

      <Button href="/found" variant="ground" size="block">
        Done
      </Button>
    </OnboardingCard>
  );
}
