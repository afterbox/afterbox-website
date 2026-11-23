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
import type { RecordFilter, RecordRow, RecordView } from "@/lib/api/types";
import { itemAmount, itemTitle } from "@/lib/dashboard/items";
import { pressable, transition } from "@/lib/motion";
import { usePrefetchItem, useRecord } from "@/store/record";

function matchesSearch(row: RecordRow, label: string, query: string) {
  const words = query.trim().toLowerCase();
  if (!words) return true;
  return [row.item.name, row.item.provider ?? "", label].some((text) => text.toLowerCase().includes(words));
}

function CollapseRow({ children }: { children: ReactNode }) {
  return <motion.div {...useCollapse()}>{children}</motion.div>;
}

/** The filter is the API's (`?filter=`); the last list stays on screen while the next loads. Search is local. */
function Record({ record, filter, onFilter }: { record: RecordView; filter: RecordFilter; onFilter: (filter: RecordFilter) => void }) {
  const { open } = useLayers();
  const prefetchItem = usePrefetchItem();
  const [query, setQuery] = useState("");

  const filters: { id: RecordFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: record.all },
    { id: "needs-details", label: "Needs details", count: record.missing },
    { id: "new", label: "New", count: record.fresh },
  ];

  const sections = record.sections
    .map((section) => ({
      ...section,
      shown: section.rows.filter((row) => matchesSearch(row, section.category.label, query)),
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
              onClick={() => onFilter(option.id)}
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
                    <div onPointerEnter={() => !row.find && prefetchItem(row.item.id)} onFocus={() => !row.find && prefetchItem(row.item.id)}>
                      <ItemRow
                        {...(row.find
                          ? { onClick: () => open("review", { find: row.item.id }) }
                          : { href: `/home/record/${row.item.category}/${row.item.id}`, name: `record-${row.item.id}` })}
                        monogram={row.item.monogram}
                        title={itemTitle(row.item)}
                        sub={[row.item.provider ? row.item.name : null, itemAmount(row.item)].filter(Boolean).join(" · ") || null}
                        status={row.status}
                      />
                    </div>
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
            {record.all === 0 ? "Nothing here yet. Add something to start." : "Nothing matches."}
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
  const [filter, setFilter] = useState<RecordFilter>("all");
  const query = useRecord(filter);
  return (
    <Ready query={query} skeleton={<RecordSkeleton />}>
      {(record) => <Record record={record} filter={filter} onFilter={setFilter} />}
    </Ready>
  );
}
