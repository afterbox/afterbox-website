"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { api, seg } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { ConfirmBody, ItemReply, ItemView, ScanResult } from "@/lib/api/types";
import { invalidateRecord, recordKeys } from "../queryKeys";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
const LONG_SIDE = 2000;

const isPdf = (file: File) => file.type === "application/pdf" || /\.pdf$/i.test(file.name);
const isHeic = (file: File) => /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);

/**
 * Photos are shrunk in the browser to about 2,000 px on the long side, as JPEG (HEIC too, where the browser can
 * decode it: Safari can). PDFs go as they are. Too large: "This file is too large" before anything is sent.
 */
export async function prepareUpload(file: File): Promise<Blob> {
  if (isPdf(file)) {
    if (file.size > MAX_PDF_BYTES) throw new ApiError(413, "FILE_TOO_LARGE", "This file is too large.", { maxBytes: MAX_PDF_BYTES });
    return file;
  }
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (isHeic(file)) throw new ApiError(415, "UNSUPPORTED_FILE", "We can read photos and PDFs.");
    if (file.size > MAX_IMAGE_BYTES) throw new ApiError(413, "FILE_TOO_LARGE", "This file is too large.", { maxBytes: MAX_IMAGE_BYTES });
    return file;
  }
  const scale = Math.min(1, LONG_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) return file;
  if (blob.size > MAX_IMAGE_BYTES) throw new ApiError(413, "FILE_TOO_LARGE", "This file is too large.", { maxBytes: MAX_IMAGE_BYTES });
  return blob;
}

/** "Snap or upload": reading happens inside the request (up to ~25 s). Nothing is saved to an item yet. */
export function useScanDocument() {
  return useMutation({
    mutationFn: async ({ file, itemId }: { file: File; itemId?: string }) => {
      const upload = await prepareUpload(file);
      const form = new FormData();
      form.append("file", upload, isPdf(file) ? "document.pdf" : "photo.jpg");
      if (itemId) form.append("itemId", itemId);
      return api.upload<ScanResult>("/v1/documents/scan", form);
    },
  });
}

/** "Check the details" → Save. Once per document: a second confirm is 409. */
export function useConfirmDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, body }: { documentId: string; body: ConfirmBody }) =>
      api.post<ItemReply>(`/v1/documents/${seg(documentId)}/confirm`, body),
    onSuccess: ({ item }) => {
      client.invalidateQueries({ queryKey: recordKeys.item(item.id) });
      invalidateRecord(client);
    },
  });
}

export function useDeleteDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId }: { documentId: string; itemId: string }) => api.delete(`/v1/documents/${seg(documentId)}`),
    onMutate: async ({ documentId, itemId }) => {
      await client.cancelQueries({ queryKey: recordKeys.item(itemId) });
      const previous = client.getQueryData<ItemView>(recordKeys.item(itemId));
      client.setQueryData<ItemView>(recordKeys.item(itemId), (view) =>
        view ? { ...view, documents: view.documents.filter((document) => document.id !== documentId) } : view,
      );
      return { previous };
    },
    onError: (_, { itemId }, context) => {
      if (context?.previous) client.setQueryData(recordKeys.item(itemId), context.previous);
    },
    onSettled: (_, __, { itemId }) => client.invalidateQueries({ queryKey: recordKeys.item(itemId) }),
  });
}

/**
 * Fetches a document's file with credentials (no-store) for the in-app viewer, as an object URL. The viewer revokes
 * it when it closes. Never in the query cache: the bytes stay only while the viewer shows them.
 */
export function useOpenDocument() {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const response = await api.get<Response>(`/v1/documents/${seg(documentId)}/file`, { raw: true });
      const blob = await response.blob();
      return { url: URL.createObjectURL(blob), type: blob.type };
    },
  });
}

/* A scan in progress, outside any component: the sheet can remount (route changes, its own steps) without losing
   the upload or its answer. In memory only, for one scan at a time; cleared when the sheet is done with it. */

export type ScanSession = { id: number; itemId?: string; status: "scanning" | "done" | "failed"; result?: ScanResult; error?: unknown };

let session: ScanSession | null = null;
let nextId = 1;
const sessionListeners = new Set<() => void>();
const setSession = (next: ScanSession | null) => {
  session = next;
  sessionListeners.forEach((listener) => listener());
};

export function useScanSession() {
  return useSyncExternalStore(
    (listener) => {
      sessionListeners.add(listener);
      return () => sessionListeners.delete(listener);
    },
    () => session,
    () => null,
  );
}

export const clearScanSession = () => setSession(null);

/** Starts reading a picked file straight away; the scan sheet shows its progress and answer. */
export function useStartScan() {
  const { mutateAsync } = useScanDocument();
  return (file: File, itemId?: string) => {
    const id = nextId++;
    setSession({ id, itemId, status: "scanning" });
    mutateAsync({ file, itemId }).then(
      (result) => session?.id === id && setSession({ id, itemId, status: "done", result }),
      (error: unknown) => session?.id === id && setSession({ id, itemId, status: "failed", error }),
    );
    return id;
  };
}
