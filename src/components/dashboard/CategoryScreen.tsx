"use client";

import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/icons";
import { useCollapse, useReveal } from "@/components/ui/onboarding/Motion";
import { BackLink, CategoryGlyph, PageTitle, Square } from "@/components/ui/dashboard/bits";
import { useLayers } from "@/components/ui/dashboard/Layer";
import Page from "@/components/ui/dashboard/Page";
import Ready from "@/components/ui/dashboard/Ready";
import { ItemRow } from "@/components/ui/dashboard/rows";
import { CategorySkeleton } from "@/components/ui/dashboard/Skeleton";
import { amountText, getCategoryView } from "@/lib/dashboard/api";
import { formatPence } from "@/lib/dashboard/format";
import type { CategoryId, DashboardState, Item } from "@/lib/dashboard/mock";
import { stagger } from "@/lib/motion";

function Row({ item, index }: { item: Item; index: number }) {
  const collapse = useCollapse();
  const reveal = useReveal().rise(index * stagger.base);
  return (
    <motion.div {...collapse} initial={reveal.initial} animate={{ ...reveal.animate, height: "auto" }} transition={reveal.transition}>
      <ItemRow
        href={`/home/record/${item.category}/${item.id}`}
        name={`category-${item.id}`}
        monogram={item.monogram}
        size="row"
        title={item.name}
        sub={amountText(item)}
        status={item.isNew ? "new" : item.complete ? "complete" : "missing"}
      />
    </motion.div>
  );
}

function Category({ id, state }: { id: CategoryId; state: DashboardState }) {
  const view = getCategoryView(state, id);
  const category = view.category!;
  const { open } = useLayers();
  const [fromHome] = useState(useSearchParams().get("from") === "home");
  const money = view.monthly > 0 ? `${formatPence(view.monthly)} a month` : view.worth > 0 ? formatPence(view.worth).replace(/\.00$/, "") : null;

  return (
    <Page>
      <BackLink href={fromHome ? "/home" : "/home/record"} name={fromHome ? "category-back-home" : "category-back-record"} label={fromHome ? "Home" : "Record"} />
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Square size={52}>
            <CategoryGlyph icon={category.icon} size={26} />
          </Square>
          <div className="min-w-0">
            <PageTitle className="mb-1">{category.label}</PageTitle>
            <p className="text-sm/normal text-ink-soft">{[`${view.items.length} saved`, money].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <Button variant="inkDeep" size="add" className="flex-none" onClick={() => open("add", { category: id })}>
          <PlusIcon size={16} strokeWidth={2.4} />
          Add
        </Button>
      </div>
      <div className="border-t border-line">
        <AnimatePresence initial={false}>
          {view.items.map((item, index) => (
            <Row key={item.id} item={item} index={index} />
          ))}
        </AnimatePresence>
      </div>
    </Page>
  );
}

export default function CategoryScreen({ id }: { id: CategoryId }) {
  return <Ready skeleton={<CategorySkeleton />}>{(state) => <Category id={id} state={state} />}</Ready>;
}
