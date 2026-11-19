"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ChevronRightIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/onboarding/format";
import type { Category } from "@/lib/onboarding/mock";
import { pressable, stagger } from "@/lib/motion";
import IconSquare, { CategoryGlyph } from "./IconSquare";
import { useReveal } from "./Motion";

export type CategorySummary = {
  category: Category;
  count: number;
  /** How many came from the bank just added. */
  added: number;
  monthly: number;
  addedFrom?: string;
};

type CategoryListProps = {
  rows: CategorySummary[];
  columns?: boolean;
  /** Seconds before the first row rises in; the rest follow a step apart. */
  enterDelay?: number;
  /** Seconds before the "+n" marks pop in. */
  marksDelay?: number;
};

/**
 * One list on phones. With `columns`, two columns from 640px, filled top to bottom,
 * each with its own top rule.
 */
export default function CategoryList({ rows, columns = false, enterDelay = 0, marksDelay = 0 }: CategoryListProps) {
  const perColumn = Math.ceil(rows.length / 2);
  const reveal = useReveal();
  return (
    <ul
      className={`border-t border-line ${columns ? "mb-[34px] sm:mb-10 sm:grid sm:grid-flow-col sm:gap-x-8 sm:border-t-0" : "mb-[34px]"}`}
      style={columns ? { gridTemplateRows: `repeat(${perColumn}, auto)` } : undefined}
    >
      {rows.map(({ category, count, added, monthly, addedFrom }, index) => {
        const last = index === rows.length - 1;
        const columnStart = index === 0 || index === perColumn;
        const columnEnd = index === perColumn - 1 || last;
        return (
          <motion.li
            key={category.id}
            {...reveal.rise(enterDelay + index * stagger.base)}
            className={`border-line ${last ? "" : "border-b"} ${columns && columnStart ? "sm:border-t" : ""} ${
              columns && columnEnd ? "sm:border-b-0" : ""
            }`}
          >
            <Link href={`/found/${category.id}`} className={`group flex items-center gap-3 py-3.5 ${pressable}`}>
              <IconSquare>
                <CategoryGlyph icon={category.icon} size={16} />
              </IconSquare>
              <span className="flex-1 text-[15px] whitespace-nowrap text-ink">
                {category.label} <span className="text-ink-soft">{count}</span>
                {added > 0 && (
                  <motion.span {...reveal.pop(marksDelay)} className="ml-1.5 inline-block text-xs/[normal] font-semibold text-positive">
                    +{added}
                    <span className="sr-only"> new from {addedFrom}</span>
                  </motion.span>
                )}
              </span>
              <span className="text-[13px] text-ink-soft tabular-nums">
                {formatMoney(monthly)}
                <span aria-hidden="true">/mo</span>
                <span className="sr-only"> a month</span>
              </span>
              <ChevronRightIcon size={16} className="text-ink-soft/70 transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] group-hover:text-ink" />
            </Link>
          </motion.li>
        );
      })}
    </ul>
  );
}
