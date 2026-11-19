"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ChevronRightIcon, GlobeIcon, SearchIcon } from "@/components/ui/icons";
import TextField from "@/components/ui/TextField";
import { pressable, transition } from "@/lib/motion";
import type { Bank } from "@/lib/onboarding/mock";
import Monogram from "./Monogram";
import { useCollapse } from "./Motion";
import QuietLink from "./QuietLink";
import TinkNote from "./TinkNote";

function resultCount(query: string, count: number) {
  if (!query) return "";
  if (count === 0) return "No UK banks match. Only UK banks for now.";
  return `${count} ${count === 1 ? "bank" : "banks"} found`;
}

type BankPickerProps = {
  banks: Bank[];
  /** Listed before anything is typed; the rest only come up in a search. */
  featured: Bank[];
  onChoose: (bank: Bank) => void;
};

/**
 * Search plus the bank list. With no match it says UK only and offers adding things by hand.
 * Rows that drop out fade and close up, new ones open, and the rest slide into place.
 */
export default function BankPicker({ banks, featured, onChoose }: BankPickerProps) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const matches = search ? banks.filter((bank) => bank.name.toLowerCase().includes(search)) : featured;
  const collapse = useCollapse();

  return (
    <>
      <TextField
        label="Search banks"
        hideLabel
        icon={<SearchIcon />}
        placeholder="Search banks"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <p role="status" className="sr-only">
        {resultCount(search, matches.length)}
      </p>

      <AnimatePresence initial={false}>
        {matches.length > 0 ? (
          <motion.div key="list" {...collapse} className="flow-root">
            <ul className="mt-3.5">
              <AnimatePresence initial={false}>
                {matches.map((bank) => (
                  <motion.li
                    key={bank.id}
                    layout="position"
                    transition={transition("base")}
                    {...collapse}
                    className="border-b border-line last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => onChoose(bank)}
                      className={`group flex w-full cursor-pointer items-center gap-3.5 px-1 py-3.5 text-left text-[15px] text-ink sm:py-[15px] ${pressable}`}
                    >
                      <Monogram letters={bank.monogram} />
                      <span className="flex-1">{bank.name}</span>
                      <ChevronRightIcon
                        size={16}
                        className="text-ink-soft/70 transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] group-hover:text-ink"
                      />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <TinkNote className="mt-3.5" />
          </motion.div>
        ) : (
          <motion.div key="empty" {...collapse} className="flow-root">
            <div className="pt-7 pb-1 text-center">
              <span className="mx-auto mb-7 flex size-12 items-center justify-center rounded-full bg-ground text-ink-soft/70">
                <GlobeIcon size={22.08} />
              </span>
              <p className="text-[15px] text-ink-soft">Only UK banks for now.</p>
            </div>
            <QuietLink href="/add" className="mt-3">
              Add things yourself instead
            </QuietLink>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
