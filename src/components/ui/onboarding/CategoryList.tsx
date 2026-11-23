"use client";

import { motion } from "motion/react";
import { ChevronRightIcon } from "@/components/ui/icons";
import { Link } from "@/components/ui/Links";
import type { FoundCategory } from "@/lib/api/types";
import { categoryInfo } from "@/lib/categories";
import { pressable, stagger } from "@/lib/motion";
import { formatMonthlyShort } from "@/lib/money";
import IconSquare, { CategoryGlyph } from "./IconSquare";
import { useReveal } from "./Motion";

type CategoryListProps = {
  rows: FoundCategory[];
  /** The bank just added, for "+n new from …". */
  addedFrom?: string;
  columns?: boolean;
  /** Seconds before the first row rises in; the rest follow a step apart. */
  enterDelay?: number;
  /** Seconds before the "+n" marks pop in. */
  marksDelay?: number;
  /** Prefetch a category on intent. */
  onIntent?: (id: string) => void;
};

/**
 * One list on phones. With `columns`, two columns from 640px, filled top to bottom, each with its own top rule.
 * Monthly totals keep each currency apart: "£34.97 + $15.49".
 */
export default function CategoryList({ rows, addedFrom, columns = false, enterDelay = 0, marksDelay = 0, onIntent }: CategoryListProps) {
  const perColumn = Math.ceil(rows.length / 2);
  const reveal = useReveal();
  return (
    <ul
      className={`border-t border-line ${columns ? "mb-[34px] sm:mb-10 sm:grid sm:grid-flow-col sm:gap-x-8 sm:border-t-0" : "mb-[34px]"}`}
      style={columns ? { gridTemplateRows: `repeat(${perColumn}, auto)` } : undefined}
    >
      {rows.map((row, index) => {
        const category = categoryInfo(row.id);
        const monthly = formatMonthlyShort(row.monthly);
        const last = index === rows.length - 1;
        const columnStart = index === 0 || index === perColumn;
        const columnEnd = index === perColumn - 1 || last;
        return (
          <motion.li
            key={row.id}
            {...reveal.rise(enterDelay + index * stagger.base)}
            className={`border-line ${last ? "" : "border-b"} ${columns && columnStart ? "sm:border-t" : ""} ${columns && columnEnd ? "sm:border-b-0" : ""}`}
          >
            <Link
              href={`/found/${row.id}`}
              name={`found-${row.id}`}
              onPointerEnter={() => onIntent?.(row.id)}
              onFocus={() => onIntent?.(row.id)}
              className={`group flex items-center gap-3 py-3.5 ${pressable}`}
            >
              <IconSquare>
                <CategoryGlyph icon={category.icon} size={16} />
              </IconSquare>
              <span className="min-w-0 flex-1 truncate text-[15px] text-ink">
                {category.label} <span className="text-ink-soft">{row.count}</span>
                {row.newFromLatestBank > 0 && (
                  <motion.span {...reveal.pop(marksDelay)} className="ml-1.5 inline-block text-xs/[normal] font-semibold text-positive">
                    +{row.newFromLatestBank}
                    <span className="sr-only"> new from {addedFrom}</span>
                  </motion.span>
                )}
              </span>
              {monthly && (
                <span className="text-right text-[13px] text-ink-soft tabular-nums">
                  {monthly}
                  <span aria-hidden="true">/mo</span>
                  <span className="sr-only"> a month</span>
                </span>
              )}
              <ChevronRightIcon size={16} className="flex-none text-ink-soft/70 transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] group-hover:text-ink" />
            </Link>
          </motion.li>
        );
      })}
    </ul>
  );
}
