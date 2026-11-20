"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import { SearchIcon } from "@/components/ui/icons";
import TextField from "@/components/ui/TextField";
import { useCollapse } from "@/components/ui/onboarding/Motion";
import { PageTitle, SectionLabel } from "@/components/ui/dashboard/bits";
import { useLayers } from "@/components/ui/dashboard/Layer";
import Page from "@/components/ui/dashboard/Page";
import Ready from "@/components/ui/dashboard/Ready";
import { ItemRow } from "@/components/ui/dashboard/rows";
import { RecordSkeleton } from "@/components/ui/dashboard/Skeleton";
import { amountText, getRecord, itemTitle, type RecordRow } from "@/lib/dashboard/api";
import type { DashboardState } from "@/lib/dashboard/mock";
import { pressable, transition } from "@/lib/motion";

type Filter = "all" | "missing" | "new";

const matchesFilter = (row: RecordRow, filter: Filter) =>
  filter === "all" ||
  (filter === "new" ? row.status === "new" : row.status === "missing" || (row.find && !row.item.complete));

function matchesSearch(row: RecordRow, label: string, query: string) {
  const words = query.trim().toLowerCase();
  if (!words) return true;
  return [row.item.name, row.item.provider ?? "", label].some((text) => text.toLowerCase().includes(words));
}

function CollapseRow({ children }: { children: ReactNode }) {
  return <motion.div {...useCollapse()}>{children}</motion.div>;
}

function Record({ state }: { state: DashboardState }) {
  const record = getRecord(state);
  const { open } = useLayers();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: record.all },
    { id: "missing", label: "Needs details", count: record.missing },
    { id: "new", label: "New", count: record.fresh },
  ];

  const sections = record.sections
    .map((section) => ({
      ...section,
      shown: section.rows.filter((row) => matchesFilter(row, filter) && matchesSearch(row, section.category.label, query)),
    }))
    .filter((section) => section.shown.length > 0);

  return (
    <Page>
      <PageTitle className="mb-6 sm:mb-8">Record</PageTitle>
      <div className="mb-5 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <TextField
            type="search"
            label="Search your record"
            hideLabel
            placeholder="Search your record"
            icon={<SearchIcon size={18} />}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
        <Button variant="inkDeep" className="h-12 flex-none max-sm:hidden" onClick={() => open("add")}>
          Add something
        </Button>
      </div>
      <div role="group" aria-label="Show" className="mb-8 flex flex-wrap gap-2">
        {filters.map((option) => {
          const active = option.id === filter;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(option.id)}
              className={`inline-flex h-[34px] cursor-pointer items-center rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-[var(--motion-base)] ease-[var(--motion-ease)] ${pressable} ${
                active ? "bg-ink-deep text-on-night" : "border border-line text-ink hover:bg-card"
              }`}
            >
              {option.label} {option.count}
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {sections.map((section) => (
          <motion.section
            key={section.category.id}
            {...sectionMotion}
            aria-label={section.category.label}
            className="pb-8"
          >
            <SectionLabel className="mb-1 uppercase">{section.category.label}</SectionLabel>
            <div className="border-t border-line">
              <AnimatePresence initial={false}>
                {section.shown.map((row) => (
                  <CollapseRow key={row.item.id}>
                    <ItemRow
                      {...(row.find
                        ? { onClick: () => open("review", { find: row.item.id }) }
                        : { href: `/record/${row.item.category}/${row.item.id}`, name: `record-${row.item.id}` })}
                      monogram={row.item.monogram}
                      title={itemTitle(row.item)}
                      sub={[row.item.provider ? row.item.name : null, amountText(row.item)].filter(Boolean).join(" · ") || null}
                      status={row.status}
                    />
                  </CollapseRow>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        ))}
      </AnimatePresence>
      <AnimatePresence>
        {sections.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition("base")}
            className="text-[15px] text-ink-soft"
          >
            Nothing matches.
          </motion.p>
        )}
      </AnimatePresence>
    </Page>
  );
}

/** A section opens when a filter brings it back and collapses when one empties it. */
const sectionMotion = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto", transition: transition("base") },
  exit: { opacity: 0, height: 0, transition: transition("fast") },
  style: { clipPath: "inset(-4px)" },
};

export default function RecordScreen() {
  return <Ready skeleton={<RecordSkeleton />}>{(state) => <Record state={state} />}</Ready>;
}
