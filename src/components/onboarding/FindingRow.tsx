"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { CheckIcon } from "@/components/ui/icons";
import Monogram from "@/components/ui/onboarding/Monogram";
import { dimmed as dimmedOpacity, transition } from "@/lib/motion";
import { formatMoney } from "@/lib/onboarding/format";
import type { Finding } from "@/lib/onboarding/mock";

type FindingRowProps = {
  finding: Finding;
  title: string;
  detail: string;
  cancelled?: boolean;
  /** Set to be cancelled: everything but the action fades back. */
  dimmed?: boolean;
  /** Under the detail line, e.g. a flag note. */
  note?: ReactNode;
  /** Replaces the amount, e.g. a Keep/Cancel switch. */
  action?: ReactNode;
  className?: string;
};

/** A found item: monogram, two lines, and its monthly amount (or an action). */
export default function FindingRow({
  finding,
  title,
  detail,
  cancelled = false,
  dimmed = false,
  note,
  action,
  className = "",
}: FindingRowProps) {
  return (
    <li className={`flex items-center gap-3 border-line ${className}`}>
      <motion.div
        initial={false}
        animate={{ opacity: dimmed ? dimmedOpacity : 1 }}
        transition={transition("base")}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <Monogram letters={finding.monogram} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] text-ink">{title}</p>
          <p className="mt-0.5 text-[13px] text-ink-soft">{detail}</p>
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
      ) : (
        <span
          className={`text-[15px] font-semibold tabular-nums ${cancelled ? "text-ink-soft line-through" : "text-ink"}`}
        >
          {formatMoney(finding.monthly)}
        </span>
      )}
    </li>
  );
}
