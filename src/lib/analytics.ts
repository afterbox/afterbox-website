"use client";

/**
 * PostHog, bundled from npm and sent through our own domain (/ingest, a Next rewrite to the EU cloud).
 * Only when NEXT_PUBLIC_POSTHOG_KEY is set (production): local and preview send nothing.
 * Nothing from a record ever goes in: no autocapture (it would read text off the page), no session recording,
 * no surveys or toolbar (they'd load extra scripts), and events carry counts only. The email is a person property
 * set by identify, never on events.
 */

import type { PostHog } from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();

let client: PostHog | null = null;
let starting: Promise<PostHog | null> | null = null;

function start(): Promise<PostHog | null> {
  if (!KEY || typeof window === "undefined") return Promise.resolve(null);
  starting ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(KEY, {
      api_host: "/ingest",
      ui_host: "https://eu.posthog.com",
      autocapture: false,
      capture_pageview: "history_change",
      capture_pageleave: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      person_profiles: "identified_only",
    });
    client = posthog;
    return posthog;
  });
  return starting;
}

export function initAnalytics() {
  void start();
}

export function identify(userId: string, email: string) {
  void start().then((posthog) => posthog?.identify(userId, { email }));
}

/** Counts and ids only: never names, amounts, providers or anything from a record. */
export function track(event: string, properties?: Record<string, number | boolean | string>) {
  void start().then((posthog) => posthog?.capture(event, properties));
}

export function resetAnalytics() {
  client?.reset();
}
