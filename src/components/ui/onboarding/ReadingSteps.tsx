"use client";

import { AnimatePresence, motion } from "motion/react";
import { BankIcon, CheckIcon, DocumentIcon, SortIcon } from "@/components/ui/icons";
import Spinner from "@/components/ui/Spinner";
import { stagger, transition } from "@/lib/motion";
import { formatBalance } from "@/lib/onboarding/format";
import type { ReadingStep } from "@/lib/onboarding/mock";
import IconSquare from "./IconSquare";
import { Collapse, useReveal } from "./Motion";

const icons = { bank: BankIcon, document: DocumentIcon, sort: SortIcon };

type Status = "done" | "running" | "waiting";

export function stepStatus(steps: ReadingStep[], index: number, elapsed: number): Status {
  if (elapsed >= steps[index].doneAt) return "done";
  if (index === 0 || elapsed >= steps[index - 1].doneAt) return "running";
  return "waiting";
}

const statusWords: Record<Status, string> = { done: "done", running: "in progress", waiting: "waiting" };

/** The mark at the end of a step. Marks stack in one cell so they cross-fade; the check scales in. */
function StatusMark({ status }: { status: Status }) {
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

/** The staged list on the reading screen. `elapsed` is milliseconds since it started. */
export default function ReadingSteps({ steps, elapsed }: { steps: ReadingStep[]; elapsed: number }) {
  const reveal = useReveal();
  return (
    <ol className="border-t border-line">
      {steps.map((step, index) => {
        const status = stepStatus(steps, index, elapsed);
        const Icon = icons[step.icon];
        const chips = step.chips?.filter((chip) => elapsed >= chip.at) ?? [];
        return (
          <li key={step.id} className="border-b border-line py-[18px]">
            <div
              className={`flex items-center gap-3 text-[15px] transition-colors duration-[var(--motion-base)] ease-[var(--motion-ease)] ${status === "waiting" ? "text-ink-soft/70" : "text-ink"}`}
            >
              <IconSquare muted={status === "waiting"}>
                <Icon size={16} />
              </IconSquare>
              <span className="flex-1">
                {step.label}
                <span className="sr-only">, {statusWords[status]}</span>
              </span>
              <StatusMark status={status} />
            </div>
            <Collapse show={chips.length > 0}>
              <ul className="mt-2.5 ml-11 flex flex-wrap gap-1.5">
                {chips.map((chip, chipIndex) => (
                  <motion.li
                    key={chip.label}
                    {...reveal.rise(chipIndex * stagger.base)}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-ground px-2.5 text-xs/[normal] text-ink"
                  >
                    {chip.label} <span className="text-ink-soft">{formatBalance(chip.balance)}</span>
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
