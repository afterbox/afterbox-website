"use client";

import { createContext, use, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { sum } from "./format";
import { getFindings, getFlags, scenarios, type Finding, type Flag, type FlagId, type Scenario } from "./mock";

export type ConnectedBank = {
  id: string;
  /** Tink's one-time code. Kept for the backend to exchange later. */
  code: string;
};

export type OnboardingState = {
  scenario: Scenario;
  /** In the order they were connected. */
  banks: ConnectedBank[];
  /** The bank being connected right now: chosen, sent to Tink, not back yet. */
  pending: { bankId: string; another: boolean } | null;
  /** A second bank that came back from Tink without connecting. */
  failedBankId: string | null;
  dismissedFlags: FlagId[];
  /** Which items each flag's cancel guide walks through. */
  plans: Partial<Record<FlagId, string[]>>;
  cancelled: string[];
  country: string;
};

const STORAGE_KEY = "afterbox.onboarding";

const initialState: OnboardingState = {
  scenario: "full",
  banks: [],
  pending: null,
  failedBankId: null,
  dismissedFlags: [],
  plans: {},
  cancelled: [],
  country: "Nigeria",
};

export function readScenario(value: string | null): Scenario | null {
  return scenarios.find((scenario) => scenario === value) ?? null;
}

function load(): OnboardingState {
  if (typeof sessionStorage === "undefined") return initialState;
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as Partial<OnboardingState> | null;
    if (!saved || typeof saved !== "object") return initialState;
    return { ...initialState, ...saved, scenario: readScenario(saved.scenario ?? null) ?? initialState.scenario };
  } catch {
    return initialState;
  }
}

/** For screens outside onboarding (log in): whether this session already has a bank connected. */
export function hasConnectedBank() {
  return load().banks.length > 0;
}

function createActions(update: (recipe: (state: OnboardingState) => OnboardingState) => void) {
  return {
    /** A fresh run with the given mock scenario. */
    start: (scenario: Scenario) => update(() => ({ ...initialState, scenario })),
    /** The first bank starts over; another bank adds to what's there. */
    chooseBank: (bankId: string, another: boolean) =>
      update((state) =>
        another
          ? { ...state, pending: { bankId, another }, failedBankId: null }
          : { ...initialState, scenario: state.scenario, country: state.country, pending: { bankId, another } },
      ),
    connectPending: (code: string) =>
      update((state) =>
        state.pending
          ? {
              ...state,
              banks: [...state.banks.filter((bank) => bank.id !== state.pending!.bankId), { id: state.pending.bankId, code }],
              pending: null,
              failedBankId: null,
            }
          : state,
      ),
    failPending: () => update((state) => ({ ...state, failedBankId: state.pending?.bankId ?? null, pending: null })),
    retryFailed: () =>
      update((state) =>
        state.failedBankId ? { ...state, pending: { bankId: state.failedBankId, another: true }, failedBankId: null } : state,
      ),
    dismissFlag: (id: FlagId) => update((state) => ({ ...state, dismissedFlags: [...new Set([...state.dismissedFlags, id])] })),
    setPlan: (id: FlagId, findingIds: string[]) => update((state) => ({ ...state, plans: { ...state.plans, [id]: findingIds } })),
    markCancelled: (findingId: string) =>
      update((state) => ({ ...state, cancelled: [...new Set([...state.cancelled, findingId])] })),
    setCountry: (country: string) => update((state) => ({ ...state, country })),
  };
}

type OnboardingContextValue = { state: OnboardingState; actions: ReturnType<typeof createActions> };

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/**
 * Session-only: closing the tab starts over. The provider renders nothing of its own, so it can
 * start from the defaults on the server; what reads the state waits for `useHydrated()`.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(load);
  const actions = useMemo(() => createActions(setState), []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return <OnboardingContext value={{ state, actions }}>{children}</OnboardingContext>;
}

const subscribeToNothing = () => () => {};

/**
 * False on the server and while hydrating, true after. The state only exists in sessionStorage,
 * so anything that shows it renders once this is true; client navigations get true straight away.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

/** Only meaningful in the browser: render callers behind `useHydrated()`. */
export function useOnboarding() {
  const context = use(OnboardingContext);
  if (!context) throw new Error("useOnboarding needs an OnboardingProvider");
  return context;
}

export function planFor(flag: Flag, state: OnboardingState) {
  return state.plans[flag.id] ?? flag.defaultPlan;
}

/** What following the flag's plan would save each month. */
export function monthlySaving(flag: Flag, plan: string[]) {
  return sum(flag.items.filter((item) => plan.includes(item.id)).map((item) => item.monthly));
}

/** A flag closes when it's dismissed, its plan is done, or fewer than 2 of its items are left. */
function isOpen(flag: Flag, state: OnboardingState) {
  if (state.dismissedFlags.includes(flag.id)) return false;
  const plan = planFor(flag, state);
  if (plan.length > 0 && plan.every((id) => state.cancelled.includes(id))) return false;
  return flag.items.filter((item) => !state.cancelled.includes(item.id)).length >= 2;
}

/** Everything found so far, and the open Worth a look flags: at most 3, biggest yearly saving first. */
export function useFindings() {
  const { state } = useOnboarding();
  return useMemo(() => {
    const findings: Finding[] = getFindings(
      state.banks.map((bank) => bank.id),
      state.scenario,
    );
    const flags = getFlags(findings)
      .filter((flag) => isOpen(flag, state))
      .sort((a, b) => monthlySaving(b, planFor(b, state)) - monthlySaving(a, planFor(a, state)))
      .slice(0, 3);
    return { findings, flags, isCancelled: (id: string) => state.cancelled.includes(id) };
  }, [state]);
}
