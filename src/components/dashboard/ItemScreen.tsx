"use client";

import { AnimatePresence, motion } from "motion/react";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CameraIcon, CheckIcon, ChevronRightIcon, ClockIcon, DocumentIcon, FlagIcon, PencilIcon, TrashIcon } from "@/components/ui/icons";
import GroupGlyph from "@/components/ui/GroupGlyph";
import Monogram from "@/components/ui/onboarding/Monogram";
import { useCollapse } from "@/components/ui/onboarding/Motion";
import { BackLink, PageTitle, SectionLabel, Square } from "@/components/ui/dashboard/bits";
import { FormNote } from "@/components/ui/dashboard/fields";
import { useDocumentPicker } from "@/components/ui/dashboard/home";
import { useLayers } from "@/components/ui/dashboard/Layer";
import Page from "@/components/ui/dashboard/Page";
import Ready from "@/components/ui/dashboard/Ready";
import { DetailRow } from "@/components/ui/dashboard/rows";
import { ItemSkeleton } from "@/components/ui/dashboard/Skeleton";
import { showToast } from "@/components/ui/dashboard/toast";
import { anyErrorCopy } from "@/lib/api/errors";
import type { ItemView } from "@/lib/api/types";
import { categoryInfo, fieldLabels, groupInfo, groupLabelFor } from "@/lib/categories";
import { formatDate, formatDay, formatSince } from "@/lib/dashboard/format";
import { itemAmount, merchantName, needsDetails } from "@/lib/dashboard/items";
import { pressable } from "@/lib/motion";
import { formatMoney } from "@/lib/money";
import { useStartScan } from "@/store/documents";
import { useItem, useMarkItemCancelled } from "@/store/record";

const addClasses = `cursor-pointer font-semibold text-ink-deep hover:underline underline-offset-3 ${pressable}`;

const kb = (size: number) => (size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`);

/** A quiet row in "Manage": icon, label, chevron. */
function ManageRow({ icon, label, tone = "ink", busy = false, last = false, onClick }: { icon: ReactNode; label: string; tone?: "ink" | "alert"; busy?: boolean; last?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`group flex min-h-[52px] w-full cursor-pointer items-center gap-3.5 py-3.5 text-left text-[15px] disabled:opacity-50 ${last ? "" : "border-b border-line"} ${tone === "alert" ? "text-alert" : "text-ink"} ${pressable}`}
    >
      <span className={tone === "alert" ? "text-alert" : "text-ink-soft"}>{icon}</span>
      <span className="flex-1">{label}</span>
      <ChevronRightIcon size={16} className="text-ink-soft/70" />
    </button>
  );
}

function ItemDetails({ view }: { view: ItemView }) {
  const { open } = useLayers();
  const cancelled = useMarkItemCancelled();
  const { item, fields, twin, person, documents } = view;
  const startScan = useStartScan();
  const picker = useDocumentPicker((file) => {
    startScan(file, item.id);
    open("scan", { item: item.id });
  });
  const collapse = useCollapse();
  const category = categoryInfo(item.category);
  const group = groupInfo(item.group);
  // Named under the provider unless the item is already called that ("Union membership").
  const groupLabel = groupLabelFor(item);
  // A regular donation: say what it is, never what stopping it would save.
  const giving = group?.giving === true;
  const who = person?.name ? person.name.split(" ")[0] : "they";
  const missing = needsDetails(item);
  const what = fields.length > 0 ? `the ${fieldLabels[fields[0]].toLowerCase()} or document` : "a document";
  const amount = itemAmount(item);

  const rows: { label: string; value: ReactNode }[] = [];
  if (item.kind === "pay" && amount) rows.push({ label: "Paid", value: amount });
  if (item.kind === "own" && item.value) rows.push({ label: "Worth about", value: amount });
  if (item.nextPayment && !item.cancelled) rows.push({ label: "Next payment", value: /^\d{4}-/.test(item.nextPayment) ? formatDay(item.nextPayment) : item.nextPayment });
  if (item.since) rows.push({ label: "Since", value: formatSince(item.since) });
  for (const field of fields) {
    const value = item.details[field];
    rows.push({
      label: fieldLabels[field],
      value: value ? (
        field === "renews" ? formatDate(value) : value
      ) : (
        <button type="button" className={addClasses} onClick={() => open("scan", { item: item.id, step: "check" })}>
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
        <Monogram letters={item.monogram} group={item.group} size="lg" />
        <div className="min-w-0">
          <PageTitle size="item" className="mb-1">
            {item.name}
          </PageTitle>
          <p className="text-sm/normal text-ink-soft">{item.provider ?? category.label}</p>
          {group && groupLabel && (
            <p className="mt-1 flex items-center gap-1.5 text-[13px]/normal text-ink-soft">
              <GroupGlyph icon={group.icon} size={14} />
              {groupLabel}
            </p>
          )}
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
          <span className="flex-1">{giving ? "Marked as stopped. We’ll check it isn’t taken again." : "Marked as cancelled. We’ll check it doesn’t charge you again."}</span>
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

      {documents.length > 0 && (
        <>
          <SectionLabel className="mb-1">DOCUMENTS</SectionLabel>
          <div className="mb-7 border-t border-line">
            {documents.map((document, index) => (
              <button
                key={document.id}
                type="button"
                onClick={() => open("document", { document: document.id, item: item.id })}
                className={`group flex min-h-[52px] w-full cursor-pointer items-center gap-3.5 py-3.5 text-left ${index < documents.length - 1 ? "border-b border-line" : ""} ${pressable}`}
              >
                <Square size={36}>
                  <DocumentIcon size={18} />
                </Square>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] text-ink">{document.type === "application/pdf" ? "PDF" : "Photo"}</span>
                  <span className="block text-[13px] text-ink-soft">
                    Added {formatDate(document.addedAt.slice(0, 10))} · {kb(document.size)}
                  </span>
                </span>
                <span className="text-sm/[normal] font-semibold text-ink-deep">Open</span>
              </button>
            ))}
          </div>
        </>
      )}

      <AnimatePresence initial={false}>
        {missing && (
          <motion.div key="upload" {...collapse}>
            <button
              type="button"
              onClick={picker.pick}
              className={`group mb-7 w-full cursor-pointer rounded-panel border-[1.5px] border-dashed border-line px-5 py-7 text-center hover:border-ink-soft/40 hover:bg-card ${pressable}`}
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

      {twin && (
        <p className="mb-7 flex items-center gap-2.5 text-[13px] text-warn">
          <FlagIcon size={14} className="flex-none" />
          <span>You also pay {twin.provider ? merchantName(twin.provider) : twin.name} for {twin.name.toLowerCase()}. If it’s the same thing, you only need one.</span>
        </p>
      )}

      <SectionLabel className="mb-1">MANAGE</SectionLabel>
      <div className="border-t border-line">
        {fields.length > 0 && <ManageRow icon={<PencilIcon size={18} />} label="Edit details" onClick={() => open("scan", { item: item.id, step: "check" })} />}
        {!missing && <ManageRow icon={<CameraIcon size={18} />} label="Add a document" onClick={picker.pick} />}
        <ManageRow icon={<DocumentIcon size={18} />} label="Not right? Change category" onClick={() => open("item-category", { item: item.id })} />
        {item.kind === "pay" && !item.cancelled && (
          <ManageRow
            icon={<CheckIcon size={18} />}
            label={giving ? "I’ve stopped this donation" : "I’ve cancelled it"}
            busy={cancelled.isPending}
            onClick={() =>
              cancelled.mutate(item.id, {
                onSuccess: ({ monthlySaving }) =>
                  showToast(giving ? "Marked as stopped" : monthlySaving.minor > 0 ? `${formatMoney(monthlySaving)} a month saved` : "Marked as cancelled"),
              })
            }
          />
        )}
        <ManageRow icon={<TrashIcon size={18} />} label="Delete" tone="alert" last onClick={() => open("delete-item", { item: item.id })} />
      </div>
      <FormNote error={cancelled.isError ? anyErrorCopy(cancelled.error) : null} />
    </Page>
  );
}

export default function ItemScreen() {
  // Kept from the first render: while this page fades out, the params already belong to the next one.
  const [itemId] = useState(useParams<{ itemId: string }>().itemId);
  const query = useItem(itemId);
  return (
    <Ready query={query} skeleton={<ItemSkeleton />}>
      {(view) => <ItemDetails view={view} />}
    </Ready>
  );
}
