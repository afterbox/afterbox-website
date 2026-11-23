"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { CheckIcon } from "@/components/ui/icons";
import Monogram from "@/components/ui/onboarding/Monogram";
import type { Finding } from "@/lib/api/types";
import { dimmed as dimmedOpacity, transition } from "@/lib/motion";
import { everyWord, formatMoney } from "@/lib/money";

type FindingRowProps = {
  finding: Finding;
  title: string;
  detail: string;
  /** Set to be cancelled: everything but the action fades back. */
  dimmed?: boolean;
  /** Under the detail line, e.g. a flag note. */
  note?: ReactNode;
  /** Replaces the amount, e.g. a Keep/Cancel switch. */
  action?: ReactNode;
  className?: string;
};

/** "£38.20" a month for most, "£220 a week" for rent paid weekly. */
export function findingAmount(finding: Finding) {
  if (finding.amount && finding.frequency && finding.frequency !== "monthly") {
    return `${formatMoney(finding.amount)} ${everyWord[finding.frequency]}`;
  }
  return finding.monthly ? formatMoney(finding.monthly) : null;
}

/** A found item: monogram, two lines, and its amount (or an action). */
export default function FindingRow({ finding, title, detail, dimmed = false, note, action, className = "" }: FindingRowProps) {
  const cancelled = finding.cancelled;
  const amount = findingAmount(finding);
  return (
    <li className={`flex items-center gap-3 border-line ${className}`}>
      <motion.div
        initial={false}
        animate={{ opacity: dimmed ? dimmedOpacity : 1 }}
        transition={transition("base")}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <Monogram letters={finding.monogram} group={finding.group} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] text-ink">{title}</p>
          <p className="mt-0.5 truncate text-[13px] text-ink-soft">{detail}</p>
          {cancelled ? (
            <span className="mt-1 inline-flex items-center gap-1 text-xs/[normal] font-semibold text-positive">
              <CheckIcon size={12} strokeWidth={2.4} />
              Cancelled
            </span>
          ) : (
            note
          )}
        </div>
      </motion.div>
      {action && !cancelled ? (
        action
      ) : amount ? (
        <span className={`text-right text-[15px] font-semibold tabular-nums ${cancelled ? "text-ink-soft line-through" : "text-ink"}`}>{amount}</span>
      ) : null}
    </li>
  );
}
