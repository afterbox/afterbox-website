"use client";

import { AnimatePresence, motion } from "motion/react";
import { BankIcon, CheckIcon, DocumentIcon, SortIcon } from "@/components/ui/icons";
import Spinner from "@/components/ui/Spinner";
import type { Progress, ReadStep } from "@/lib/api/types";
import { stagger, transition } from "@/lib/motion";
import { formatBalance } from "@/lib/money";
import IconSquare from "./IconSquare";
import { Collapse, useReveal } from "./Motion";

export type StepStatus = "done" | "running" | "waiting";

const icons: Record<ReadStep, typeof BankIcon> = { accounts: BankIcon, transactions: DocumentIcon, sorting: SortIcon };

export function stepLabel(step: ReadStep, another: boolean) {
  if (step === "accounts") return "Finding your accounts";
  if (step === "transactions") return "Reading 2 years of transactions";
  return another ? "Adding to what we found" : "Sorting what we find";
}

/** The line under the steps while one runs. The transactions step sends nothing while it works, so it says so. */
export function stepHint(step: ReadStep) {
  if (step === "transactions") return "Reading your payments…";
  if (step === "sorting") return "Almost there";
  return "Usually under a minute";
}

/** Steps finish in order: the first one not done is running while the read is. */
export function stepStatuses(progress: Progress): StepStatus[] {
  const firstOpen = progress.steps.findIndex((step) => !step.done);
  return progress.steps.map((step, index) => {
    if (step.done || progress.status === "done") return "done";
    return progress.status === "reading" && index === firstOpen ? "running" : "waiting";
  });
}

const statusWords: Record<StepStatus, string> = { done: "done", running: "in progress", waiting: "waiting" };

/** The mark at the end of a step. Marks stack in one cell so they cross-fade; the check scales in. */
function StatusMark({ status }: { status: StepStatus }) {
  const reveal = useReveal();
  return (
    <span className="grid flex-none place-items-center *:col-start-1 *:row-start-1">
      <AnimatePresence initial={false}>
        {status === "done" ? (
          <motion.span key="done" {...reveal.pop()} exit={{ opacity: 0 }} className="flex">
            <CheckIcon size={18} className="text-positive" />
          </motion.span>
        ) : status === "running" ? (
          <motion.span key="running" {...reveal.fade()} exit={{ opacity: 0, transition: transition("fast") }} className="flex">
            <Spinner className="text-ink-soft" />
          </motion.span>
        ) : (
          <motion.span
            key="waiting"
            {...reveal.fade()}
            exit={{ opacity: 0, transition: transition("fast") }}
            aria-hidden="true"
            className="size-4 flex-none rounded-full border-2 border-line"
          />
        )}
      </AnimatePresence>
    </span>
  );
}

/** The staged list on the reading screen, from GET /v1/banks/connections/:id/progress. */
export default function ReadingSteps({ progress, another }: { progress: Progress; another: boolean }) {
  const reveal = useReveal();
  const statuses = stepStatuses(progress);
  return (
    <ol className="border-t border-line">
      {progress.steps.map((step, index) => {
        const status = statuses[index];
        const Icon = icons[step.id] ?? DocumentIcon;
        const chips = step.id === "accounts" ? progress.chips : [];
        return (
          <li key={step.id} className="border-b border-line py-[18px]">
            <div
              className={`flex items-center gap-3 text-[15px] transition-colors duration-[var(--motion-base)] ease-[var(--motion-ease)] ${status === "waiting" ? "text-ink-soft/70" : "text-ink"}`}
            >
              <IconSquare muted={status === "waiting"}>
                <Icon size={16} />
              </IconSquare>
              <span className="flex-1">
                {stepLabel(step.id, another)}
                <span className="sr-only">, {statusWords[status]}</span>
              </span>
              <StatusMark status={status} />
            </div>
            <Collapse show={chips.length > 0}>
              <ul className="mt-2.5 ml-11 flex flex-wrap gap-1.5">
                {chips.map((chip, chipIndex) => (
                  <motion.li
                    key={`${chip.label}-${chipIndex}`}
                    {...reveal.rise(chipIndex * stagger.base)}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-ground px-2.5 text-xs/[normal] text-ink"
                  >
                    {chip.label} {chip.balance && <span className="text-ink-soft">{formatBalance(chip.balance)}</span>}
                  </motion.li>
                ))}
              </ul>
            </Collapse>
          </li>
        );
      })}
    </ol>
  );
}
