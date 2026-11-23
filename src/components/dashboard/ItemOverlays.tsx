"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { TrashIcon } from "@/components/ui/icons";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import Spinner from "@/components/ui/Spinner";
import { Lead } from "@/components/ui/dashboard/bits";
import { FormNote } from "@/components/ui/dashboard/fields";
import { DialogTitle, Overlay, useLayers } from "@/components/ui/dashboard/Layer";
import { showToast } from "@/components/ui/dashboard/toast";
import { anyErrorCopy } from "@/lib/api/errors";
import type { CategoryId } from "@/lib/api/types";
import { categoryInfo, pickerOrder } from "@/lib/categories";
import { itemTitle } from "@/lib/dashboard/items";
import { useDeleteDocument, useOpenDocument } from "@/store/documents";
import { useCategories } from "@/store/meta";
import { useChangeItemCategory, useDeleteItem, useItem } from "@/store/record";
import WhereGrid from "@/components/ui/dashboard/WhereGrid";

/** "Not right? Change category" on an item: the Where does it go? picker, applied at once (rolled back on failure). */
export function ItemCategoryOverlay() {
  const { close, closeTo, param } = useLayers();
  const itemId = param("item") ?? "";
  const view = useItem(itemId);
  const change = useChangeItemCategory();
  const meta = useCategories();
  const categories = (meta.data?.pickerOrder ?? pickerOrder).map((id) => categoryInfo(id));
  const item = view.data?.item;
  if (!item) return null;

  function pick(category: CategoryId) {
    if (!item || category === item.category) return close();
    change.mutate(
      { id: item.id, category },
      {
        onSuccess: ({ item: moved }) => {
          // The item now lives under its new category's URL: close the sheet onto it.
          closeTo(`/home/record/${moved.category}/${moved.id}`);
          showToast(`Moved to ${categoryInfo(moved.category).label}`);
        },
      },
    );
  }

  return (
    <Overlay kind="modal" width={520} onClose={close} label="Where does it go?">
      <DialogTitle className="mb-7 text-center">Where does it go?</DialogTitle>
      <WhereGrid categories={categories} value={item.category} onPick={pick} />
      <FormNote error={change.isError ? anyErrorCopy(change.error) : null} />
      <QuietLink onClick={close} className="mt-1">
        Keep it in {categoryInfo(item.category).label}
      </QuietLink>
    </Overlay>
  );
}

/** Delete an item (and its documents). */
export function DeleteItemOverlay() {
  const { closeTo, close, param } = useLayers();
  const itemId = param("item") ?? "";
  const view = useItem(itemId);
  const remove = useDeleteItem();
  const [kept, setKept] = useState(view.data?.item ?? null);
  if (view.data?.item && view.data.item !== kept) setKept(view.data.item);
  const item = view.data?.item ?? kept;
  if (!item) return null;

  return (
    <Overlay kind="modal" width={480} onClose={close}>
      <div className="text-center">
        <span aria-hidden="true" className="mx-auto mb-5 flex size-14 items-center justify-center rounded-field bg-alert/8 text-alert">
          <TrashIcon size={26} />
        </span>
        <DialogTitle className="mb-2">Delete {itemTitle(item)}?</DialogTitle>
        <Lead className="mb-9">It leaves your record, with its documents. This can’t be undone.</Lead>
      </div>
      <Button
        variant="alert"
        size="block"
        loading={remove.isPending}
        loadingLabel="Deleting"
        onClick={() =>
          remove.mutate(item.id, {
            onSuccess: () => {
              closeTo(`/home/record/${item.category}`);
              showToast("Deleted");
            },
          })
        }
      >
        Delete
      </Button>
      <FormNote error={remove.isError ? anyErrorCopy(remove.error) : null} />
      <QuietLink onClick={close} className="mt-[18px]">
        Keep it
      </QuietLink>
    </Overlay>
  );
}

/**
 * A document, opened in place: fetched with credentials (no-store) into an object URL that is revoked when the viewer
 * closes. Images in an img, PDFs in a frame (CSP allows frame-src blob:).
 */
export function DocumentOverlay() {
  const { close, param } = useLayers();
  const documentId = param("document");
  const itemId = param("item") ?? "";
  const open = useOpenDocument();
  const remove = useDeleteDocument();
  const [file, setFile] = useState<{ url: string; type: string } | null>(null);
  const { mutate } = open;

  useEffect(() => {
    if (!documentId) return;
    let url: string | null = null;
    mutate(documentId, {
      onSuccess: (opened) => {
        url = opened.url;
        setFile(opened);
      },
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [documentId, mutate]);

  if (!documentId) return null;

  return (
    <Overlay kind="focus" width={560} onClose={close} label="Document">
      <div className="mb-5 flex min-h-[60vh] items-center justify-center overflow-hidden rounded-panel border border-line bg-ground">
        {file ? (
          file.type.startsWith("image/") ? (
            // A decrypted blob: URL, never cached.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.url} alt="Your document" className="max-h-[70vh] w-auto object-contain" />
          ) : (
            <iframe src={file.url} title="Your document" className="h-[70vh] w-full" />
          )
        ) : open.isError ? (
          <p className="px-6 text-center text-[15px] text-ink-soft">{anyErrorCopy(open.error)}</p>
        ) : (
          <Spinner className="text-ink-soft" />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {file && (
          <a href={file.url} download className="text-sm/[normal] font-semibold text-ink-deep underline-offset-3 hover:underline">
            Download
          </a>
        )}
        <button
          type="button"
          disabled={remove.isPending}
          onClick={() =>
            remove.mutate(
              { documentId, itemId },
              {
                onSuccess: () => {
                  close();
                  showToast("Document deleted");
                },
              },
            )
          }
          className="ml-auto cursor-pointer text-sm/[normal] font-semibold text-alert hover:opacity-80 disabled:opacity-40"
        >
          {remove.isPending ? "Deleting…" : "Delete document"}
        </button>
      </div>
      <FormNote error={remove.isError ? anyErrorCopy(remove.error) : null} />
    </Overlay>
  );
}
