"use client";

import { AnimatePresence, motion } from "motion/react";
import { notFound, useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CameraIcon, CheckIcon, ClockIcon, FlagIcon } from "@/components/ui/icons";
import { Link } from "@/components/ui/Links";
import Monogram from "@/components/ui/onboarding/Monogram";
import { useCollapse } from "@/components/ui/onboarding/Motion";
import { BackLink, PageTitle, SectionLabel, Square } from "@/components/ui/dashboard/bits";
import { useDocumentPicker } from "@/components/ui/dashboard/home";
import { useLayers } from "@/components/ui/dashboard/Layer";
import Page from "@/components/ui/dashboard/Page";
import Ready from "@/components/ui/dashboard/Ready";
import { DetailRow } from "@/components/ui/dashboard/rows";
import { ItemSkeleton } from "@/components/ui/dashboard/Skeleton";
import { amountText, getItem, monthlyOf, needsDetails } from "@/lib/dashboard/api";
import { formatDate, formatDay, formatPence, formatSince } from "@/lib/dashboard/format";
import { detailLabels, getCategory, type DashboardState } from "@/lib/dashboard/mock";
import { pressable } from "@/lib/motion";

const addClasses = `cursor-pointer font-semibold text-ink-deep hover:underline underline-offset-3 ${pressable}`;

function ItemView({ id, state }: { id: string; state: DashboardState }) {
  const view = getItem(state, id);
  const { open } = useLayers();
  const picker = useDocumentPicker(() => open("scan", { item: id }));
  const collapse = useCollapse();
  if (!view) notFound();
  const { item, fields, twin, person } = view;
  const category = getCategory(item.category)!;
  const who = person ? person.name.split(" ")[0] : "they";
  const missing = needsDetails(item);
  const what = fields.length > 0 ? `the ${detailLabels[fields[0]].toLowerCase()} or document` : "a document";

  const rows: { label: string; value: ReactNode }[] = [];
  if (item.kind === "pay" && amountText(item)) rows.push({ label: "Paid", value: amountText(item) });
  if (item.kind === "own" && item.value !== null) rows.push({ label: "Worth about", value: amountText(item) });
  if (item.nextPayment && !item.cancelled) rows.push({ label: "Next payment", value: formatDay(item.nextPayment) });
  if (item.since) rows.push({ label: "Since", value: formatSince(item.since) });
  for (const field of fields) {
    const value = item.details[field];
    rows.push({
      label: detailLabels[field],
      value: value ? (
        field === "renews" ? formatDate(value) : value
      ) : (
        <button type="button" className={addClasses} onClick={() => open("scan", { item: id, step: "check" })}>
          Add
        </button>
      ),
    });
  }

  return (
    <Page>
      {picker.input}
      <BackLink href={`/home/record/${item.category}`} name="item-back" label={category.label} className="max-sm:hidden" />
      <div className="mb-6 flex items-center gap-4">
        <Monogram letters={item.monogram} size="lg" />
        <div className="min-w-0">
          <PageTitle size="item" className="mb-1">
            {item.name}
          </PageTitle>
          <p className="text-sm/normal text-ink-soft">{item.provider ?? category.label}</p>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {missing && (
          <motion.div key="missing" {...collapse}>
            <p className="mb-7 flex items-center gap-2.5 rounded-panel border border-line bg-ground px-4 py-3.5 text-sm/normal text-ink">
              <ClockIcon size={17} className="flex-none text-ink-soft" />
              <span className="flex-1">
                Needs details. Add {what} so {who} can claim it.
              </span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {item.cancelled && (
        <p className="mb-7 flex items-center gap-2.5 rounded-panel border border-line bg-positive/6 px-4 py-3.5 text-sm/normal text-ink">
          <CheckIcon size={17} className="flex-none text-positive" />
          <span className="flex-1">
            {item.provider ?? item.name} didn’t charge you · {formatPence(monthlyOf(item) * 12)} a year saved
          </span>
        </p>
      )}

      <SectionLabel className="mb-1">DETAILS</SectionLabel>
      <div className="mb-7 border-t border-line">
        {rows.map((row, index) => (
          <DetailRow key={row.label} label={row.label} last={index === rows.length - 1}>
            {row.value}
          </DetailRow>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {missing && (
          <motion.div key="upload" {...collapse}>
            <button
              type="button"
              onClick={picker.pick}
              className={`group w-full cursor-pointer rounded-panel border-[1.5px] border-dashed border-line px-5 py-7 text-center hover:border-ink-soft/40 hover:bg-card ${pressable}`}
            >
              <Square size={44} className="mx-auto mb-3">
                <CameraIcon size={22} />
              </Square>
              <span className="block text-[15px] text-ink">Snap or upload a document</span>
              <span className="mt-1 block text-[13px] text-ink-soft">We’ll fill in the details for you</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {twin && twin.provider && (
        <p className="mt-4 flex items-center gap-2.5 text-[13px] text-warn">
          <FlagIcon size={14} className="flex-none" />
          <span>
            You also pay {twin.provider} for home insurance.{" "}
            <Link href="/found/look/home-insurance" name="item-look" className="font-semibold underline underline-offset-3">
              Look
            </Link>
          </span>
        </p>
      )}
    </Page>
  );
}

function ItemFromParams({ state }: { state: DashboardState }) {
  // Kept from the first render: while this page fades out, the params already belong to the next one.
  const [itemId] = useState(useParams<{ itemId: string }>().itemId);
  return <ItemView id={itemId} state={state} />;
}

export default function ItemScreen() {
  return <Ready skeleton={<ItemSkeleton />}>{(state) => <ItemFromParams state={state} />}</Ready>;
}
