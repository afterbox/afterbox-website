"use client";

import { useSyncExternalStore } from "react";

function subscribeTo(query: string) {
  return (onChange: () => void) => {
    const list = window.matchMedia(query);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  };
}

const subscribers = new Map<string, (onChange: () => void) => () => void>();

/** Follows a media query live. False on the server. */
export function useMedia(query: string) {
  let subscribe = subscribers.get(query);
  if (!subscribe) {
    subscribe = subscribeTo(query);
    subscribers.set(query, subscribe);
  }
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Phones: under 640px. Overlays become bottom sheets and full-screen pages. */
export const useMobile = () => !useMedia("(min-width: 640px)");

/** The rail widens on hover only from 1024px. */
export const useWide = () => useMedia("(min-width: 1024px)");
