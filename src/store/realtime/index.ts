"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { RealtimeEvent, RealtimeName } from "@/lib/api/types";
import { approvalKeys } from "../approvals";
import { bankKeys } from "../banks";
import { helpKeys } from "../help";
import { invalidateFound, invalidateRecord, recordKeys } from "../queryKeys";
import { meKeys } from "../me";
import { securityKeys } from "../security";

/* A small bus, so screens can react to an event as well as the cache (open the approve sheet, move on from a wait). */

type Listener = (event: RealtimeEvent) => void;
const listeners = new Set<Listener>();

export function emitRealtime(event: RealtimeEvent) {
  listeners.forEach((listener) => listener(event));
}

/** Runs `handler` for every `name` event while mounted. */
type DataOf<N extends RealtimeName> = Extract<RealtimeEvent, { name: N }>["data"];

export function useRealtimeEvent<N extends RealtimeName>(name: N, handler: (data: DataOf<N>) => void) {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(() => {
    const listener: Listener = (event) => {
      if (event.name === name) (latest.current as (data: unknown) => void)(event.data);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [name]);
}

/** Each event in API.md mapped to exactly what it changes. */
export function invalidateFor(client: QueryClient, event: RealtimeEvent) {
  switch (event.name) {
    case "scan.progress": {
      client.invalidateQueries({ queryKey: bankKeys.progress(event.data.connectionId) });
      if (event.data.status !== "reading") {
        client.invalidateQueries({ queryKey: bankKeys.all });
        invalidateFound(client);
      }
      return;
    }
    case "finds.new":
      client.invalidateQueries({ queryKey: bankKeys.progress(event.data.connectionId) });
      client.invalidateQueries({ queryKey: bankKeys.all });
      invalidateFound(client);
      invalidateRecord(client);
      return;
    case "bank.status":
      client.invalidateQueries({ queryKey: bankKeys.all });
      client.invalidateQueries({ queryKey: bankKeys.progress(event.data.connectionId) });
      client.invalidateQueries({ queryKey: recordKeys.home }, { cancelRefetch: false });
      if (event.data.status === "failed" || event.data.status === "disconnected") invalidateFound(client);
      return;
    case "categories.updated":
      invalidateFound(client);
      invalidateRecord(client);
      return;
    case "saving.result":
      client.invalidateQueries({ queryKey: recordKeys.home }, { cancelRefetch: false });
      client.invalidateQueries({ queryKey: recordKeys.item(event.data.entryId) });
      return;
    case "device.approval_requested":
      client.invalidateQueries({ queryKey: approvalKeys.one(event.data.approvalId) });
      return;
    case "device.approved":
      client.invalidateQueries({ queryKey: approvalKeys.one(event.data.approvalId) });
      client.invalidateQueries({ queryKey: helpKeys.one(event.data.approvalId) });
      client.invalidateQueries({ queryKey: securityKeys.all });
      return;
    case "person.accepted":
    case "person.removed":
      client.invalidateQueries({ queryKey: recordKeys.people });
      client.invalidateQueries({ queryKey: recordKeys.home }, { cancelRefetch: false });
      client.invalidateQueries({ queryKey: meKeys.all });
      client.invalidateQueries({ queryKey: securityKeys.all });
      return;
    case "help.requested":
    case "help.alert":
    case "help.cancelled":
      client.invalidateQueries({ queryKey: helpKeys.one(event.data.requestId) });
      return;
    case "plan.changed":
      client.invalidateQueries({ queryKey: meKeys.all });
      client.invalidateQueries({ queryKey: recordKeys.home }, { cancelRefetch: false });
      client.invalidateQueries({ queryKey: bankKeys.all });
      return;
  }
}

/** After a reconnect: anything that may have moved while we weren't listening. */
export function refetchAfterReconnect(client: QueryClient) {
  client.invalidateQueries({ queryKey: ["banks", "progress"] });
  client.invalidateQueries({ queryKey: ["approvals"] });
  client.invalidateQueries({ queryKey: ["help"] });
  client.invalidateQueries({ queryKey: recordKeys.home }, { cancelRefetch: false });
  client.invalidateQueries({ queryKey: recordKeys.found });
}
