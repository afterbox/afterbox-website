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
import type { CategoryView, Item } from "@/lib/api/types";
import { categoryInfo } from "@/lib/categories";
import { itemAmount } from "@/lib/dashboard/items";
import { stagger } from "@/lib/motion";
import { formatMoneyList, formatValue } from "@/lib/money";
import { usePrefetchItem, useCategoryView } from "@/store/record";

function Row({ item, index }: { item: Item; index: number }) {
  const collapse = useCollapse();
  const reveal = useReveal().rise(index * stagger.base);
  const prefetch = usePrefetchItem();
  return (
    <motion.div
      {...collapse}
      initial={reveal.initial}
      animate={{ ...reveal.animate, height: "auto" }}
      transition={reveal.transition}
      onPointerEnter={() => prefetch(item.id)}
      onFocus={() => prefetch(item.id)}
    >
      <ItemRow
        href={`/home/record/${item.category}/${item.id}`}
        name={`category-${item.id}`}
        monogram={item.monogram}
        group={item.group}
        size="row"
        title={item.name}
        sub={itemAmount(item)}
        status={item.isNew ? "new" : item.complete ? "complete" : "missing"}
      />
    </motion.div>
  );
}

function Category({ id, view }: { id: string; view: CategoryView }) {
  const category = { ...categoryInfo(id), ...view.category };
  const { open } = useLayers();
  const [fromHome] = useState(useSearchParams().get("from") === "home");
  const money = formatMoneyList(view.monthly, "a month") ?? formatMoneyList(view.worth, "", formatValue);

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

export default function CategoryScreen({ id }: { id: string }) {
  const query = useCategoryView(id);
  return (
    <Ready query={query} skeleton={<CategorySkeleton />}>
      {(view) => <Category id={id} view={view} />}
    </Ready>
  );
}
