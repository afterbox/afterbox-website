"use client";

import { useSyncExternalStore } from "react";
import { onboardingActions, readOnboarding } from "@/lib/onboarding/store";
import { addDemoDevices, bootSecurity, freshMock } from "@/lib/security/recovery";
import { createSessionStore } from "@/lib/sessionStore";
import {
  dashboardScenarios,
  onboardingFor,
  seedFromOnboarding,
  seedManual,
  seedScenario,
  type DashboardState,
  type Scenario,
} from "./mock";

const STORAGE_KEY = "afterbox.dashboard";

export const dashboardStore = createSessionStore<DashboardState | null>(STORAGE_KEY, null, (saved) =>
  saved && typeof saved === "object" && Array.isArray((saved as DashboardState).items) ? (saved as DashboardState) : null,
);

/** `?mock=slow` and `?mock=fail` for this session: slow stays on, fail is used up by the next call. */
export const mockFlags = createSessionStore<{ slow: boolean; fail: boolean }>(
  "afterbox.mock",
  { slow: false, fail: false },
  (saved) => ({ slow: Boolean((saved as { slow?: boolean })?.slow), fail: Boolean((saved as { fail?: boolean })?.fail) }),
);

export function update(recipe: (state: DashboardState) => DashboardState) {
  dashboardStore.set((state) => (state ? recipe(state) : state));
}

function seedFrom(scenario: Scenario) {
  const implied = onboardingFor[scenario];
  onboardingActions.seed(scenario === "empty" ? "thin" : "full", implied.banks, implied.cancelled);
  dashboardStore.set(() => seedScenario(scenario));
}

/** Whatever onboarding left behind; straight to the dashboard with nothing seeds day 1. */
function seedDefault() {
  const onboarding = readOnboarding();
  if (onboarding.banks.length > 0) {
    dashboardStore.set(() =>
      seedFromOnboarding(
        onboarding.banks.map((bank) => bank.id),
        onboarding.scenario,
        onboarding.cancelled,
      ),
    );
  } else {
    seedFrom("day1");
  }
}

/**
 * Applies `?mock=` (scenarios and slow/fail, comma separated) and `?start=manual`, then seeds
 * from onboarding if nothing is there yet. Returns the params it used, to drop from the URL.
 */
export function boot(params: URLSearchParams) {
  const used: string[] = [];
  const tokens = (params.get("mock") ?? "").split(",").map((token) => token.trim());
  if (params.has("mock")) used.push("mock");

  // A new device belongs to an existing member: day 2, unless a scenario says otherwise.
  const fresh = freshMock(params);
  const scenario = fresh
    ? (tokens.find((token): token is Scenario => dashboardScenarios.includes(token as Scenario)) ??
      (tokens.includes("newdevice") ? "day2" : undefined))
    : undefined;
  if (fresh) {
    mockFlags.set(() => ({ slow: tokens.includes("slow"), fail: tokens.includes("fail") }));
    bootSecurity(params);
  }
  if (scenario === "day2" || scenario === "accepted") addDemoDevices();

  if (scenario) seedFrom(scenario);
  else if (params.get("start") === "manual") {
    used.push("start");
    dashboardStore.set(() => seedManual());
  } else if (!dashboardStore.get()) seedDefault();

  return used;
}

/* First load: the data "arrives" after the mock delay, once per page load. */

let loaded = false;
const loadListeners = new Set<() => void>();

export function markLoaded() {
  loaded = true;
  loadListeners.forEach((listener) => listener());
}

export function useLoaded() {
  return useSyncExternalStore(
    (listener) => {
      loadListeners.add(listener);
      return () => loadListeners.delete(listener);
    },
    () => loaded,
    () => false,
  );
}

export function useDashboardState() {
  return dashboardStore.useValue();
}

/** Logging out ends the mock session. The member part stays in this browser; the next sign-in asks for the passkey. */
export function clearSession() {
  dashboardStore.set(() => null);
  mockFlags.set(() => ({ slow: false, fail: false }));
  onboardingActions.reset();
  loaded = false;
}
