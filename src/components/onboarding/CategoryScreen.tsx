"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { FlagIcon } from "@/components/ui/icons";
import IconSquare, { CategoryGlyph } from "@/components/ui/onboarding/IconSquare";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import { FindingListSkeleton } from "@/components/ui/onboarding/Skeletons";
import type { Finding, Money } from "@/lib/api/types";
import { categoryInfo } from "@/lib/categories";
import { formatSince } from "@/lib/dashboard/format";
import { formatMoneyList } from "@/lib/money";
import { useFoundCategory } from "@/store/onboarding";
import FindingRow from "./FindingRow";

/** Monthly totals per currency, leaving out what's cancelled. */
function monthlyTotals(findings: Finding[]): Money[] {
  const totals = new Map<string, number>();
  for (const finding of findings) {
    if (finding.cancelled || !finding.monthly) continue;
    totals.set(finding.monthly.currency, (totals.get(finding.monthly.currency) ?? 0) + finding.monthly.minor);
  }
  return [...totals].map(([currency, minor]) => ({ minor, currency }));
}

/** "Tenant · £950 a month": the find's provider and how it's paid; for rental income, "you may let out a property". */
function titleOf(finding: Finding) {
  return finding.name === "Rental income" ? "Rental income: you may let out a property" : finding.name;
}

/** 09: everything in one category. */
export default function CategoryScreen({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const view = useFoundCategory(categoryId);
  const category = categoryInfo(categoryId);
  const items = view.data?.findings ?? [];

  useEffect(() => {
    router.prefetch("/found");
  }, [router]);

  useEffect(() => {
    if (view.isError || (view.isSuccess && items.length === 0)) router.replace("/found");
  }, [items.length, router, view.isError, view.isSuccess]);

  if (view.isPending || items.length === 0) {
    return (
      <OnboardingCard size="category">
        <FindingListSkeleton />
      </OnboardingCard>
    );
  }

  const [singular, plural] = category.unit;
  const monthly = formatMoneyList(monthlyTotals(items), "a month");

  return (
    <OnboardingCard size="category">
      <div className="mb-1.5 flex items-center gap-3">
        <IconSquare size="lg">
          <CategoryGlyph icon={category.icon} size={20} />
        </IconSquare>
        <div className="min-w-0">
          <h1 tabIndex={-1} className="text-[24px]/[1.1] font-normal tracking-[-0.03em] text-ink outline-none sm:text-[28px]/[1.1]">
            {category.label}
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {items.length} {items.length === 1 ? singular : plural}
            {monthly && ` · ${monthly}`}
          </p>
        </div>
      </div>

      <ul className="mt-[26px] mb-[34px] border-t border-line">
        {items.map((item) => (
          <FindingRow
            key={item.id}
            finding={item}
            title={titleOf(item)}
            detail={[item.provider, item.since ? `Since ${formatSince(item.since)}` : null].filter(Boolean).join(" · ")}
            className="border-b py-[17px]"
            note={
              item.note && (
                <span className="mt-1 inline-flex items-center gap-1 text-xs/[normal] font-semibold text-warn">
                  <FlagIcon size={12} />
                  {item.note}
                </span>
              )
            }
          />
        ))}
      </ul>

      <Button href="/found" name="category-done" variant="ground" size="block">
        Done
      </Button>
    </OnboardingCard>
  );
}
