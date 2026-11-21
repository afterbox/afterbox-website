"use client";

import { AnimatePresence, MotionConfig, motion, useIsPresent, useTransform } from "motion/react";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, use, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { pageCover, useLayerHistory } from "@/components/ui/dashboard/Layer";
import { Toaster } from "@/components/ui/dashboard/toast";
import { mockAccount } from "@/lib/dashboard/mock";
import { dashboardStore, mockFlags } from "@/lib/dashboard/store";
import { cssMotionVars, distance, pressable, transition } from "@/lib/motion";
import { settlePending } from "@/lib/security/device";
import { bootSecurity, freshMock } from "@/lib/security/recovery";
import { accessHref, useAccess, useUnlock } from "@/lib/security/store";
import { useSeededAccess } from "@/lib/security/useSeededAccess";
import { useMotionTokens } from "@/lib/useMotionTokens";
import YoureIn from "@/components/security/YoureIn";

/** Phones: which screens have a back chevron (06, 09, 10, 13), and where it falls back to. */
function backFor(pathname: string, params: URLSearchParams) {
  if (pathname === "/unlock") return params.has("wait") ? "/unlock" : null;
  if (pathname === "/unlock/ask" && params.has("sent")) return null;
  if (pathname.startsWith("/unlock/")) return "/unlock";
  return null;
}

function Initials() {
  const initials = dashboardStore.useValue()?.account.initials ?? mockAccount().initials;
  return (
    <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-mist text-[13px] font-semibold text-ink-deep">
      {initials}
    </span>
  );
}

function BackChevron({ hidden }: { hidden: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const back = hidden ? null : backFor(pathname, params);
  if (!back) return null;
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => (window.history.length > 1 ? router.back() : router.replace(back))}
      className={`-ml-2.5 flex size-11 cursor-pointer items-center justify-center rounded-full text-ink ${pressable}`}
    >
      <ChevronLeftIcon size={22} />
    </button>
  );
}

function Header({ hideBack }: { hideBack: boolean }) {
  return (
    <header className="flex h-[calc(52px+env(safe-area-inset-top))] flex-none items-center justify-between px-5 pt-[env(safe-area-inset-top)] sm:h-[88px] sm:px-10 sm:pt-0">
      <span className="text-[26px] font-semibold tracking-[-0.035em] text-ink max-sm:hidden">afterbox</span>
      <span className="sm:hidden">
        <Suspense>
          <BackChevron hidden={hideBack} />
        </Suspense>
      </span>
      <span className="max-sm:hidden">
        <Initials />
      </span>
    </header>
  );
}

function FrozenRouter({ children }: { children: ReactNode }) {
  const context = use(LayoutRouterContext);
  const isPresent = useIsPresent();
  const [frozen, setFrozen] = useState(context);
  if (isPresent && frozen !== context) setFrozen(context);
  return <LayoutRouterContext value={isPresent ? context : frozen}>{children}</LayoutRouterContext>;
}

function FocusTitle({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (document.querySelector("[role=dialog]")) return;
      ref.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div ref={ref}>{children}</div>;
}

function seedMock(params: URLSearchParams) {
  if (!freshMock(params)) return;
  const tokens = (params.get("mock") ?? "").split(",").map((token) => token.trim());
  mockFlags.set(() => ({ slow: tokens.includes("slow"), fail: tokens.includes("fail") }));
  bootSecurity(params);
}

/** Applies `?mock=` on later navigations, sends people where they belong, and completes approvals once due. */
function Boot() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const access = useAccess();
  const { status } = useUnlock();
  const unlocking = pathname.startsWith("/unlock");

  useEffect(() => {
    seedMock(params);
    if (!params.has("mock")) return;
    const next = new URLSearchParams(params.toString());
    next.delete("mock");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  useEffect(() => {
    if (!unlocking || access === "pending" || params.has("mock")) return;
    if (access === "secure") router.replace(accessHref.secure);
    else if (access === "open" && status === "open") router.replace(accessHref.open);
  }, [unlocking, access, status, params, router]);

  useEffect(() => {
    if (!unlocking) return;
    router.prefetch("/home");
    const interval = setInterval(() => settlePending(), 500);
    return () => clearInterval(interval);
  }, [unlocking, router]);

  useLayerHistory();
  return null;
}

function Stage({ id, children }: { id: string; children: ReactNode }) {
  const { move } = useMotionTokens();
  const [visit, setVisit] = useState(0);
  useLayoutEffect(() => () => setVisit((count) => count + 1), []);
  return (
    <AnimatePresence key={visit} mode="wait" initial={false}>
      <motion.div
        key={id}
        initial={{ opacity: 0, y: move(distance.rise) }}
        animate={{ opacity: 1, y: 0, transition: transition("base") }}
        exit={{ opacity: 0, transition: transition("fast") }}
      >
        <FrozenRouter>
          <FocusTitle>{children}</FocusTitle>
        </FrozenRouter>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Setting up (/secure) and getting back in (/unlock). Desktop: the wordmark and avatar over a centred
 * card. Phones: full screen, centred, with a back chevron where the design has one; sheets scale it back.
 */
export default function SecurityShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const access = useSeededAccess(seedMock);
  const { status } = useUnlock();
  const scale = useTransform(pageCover, [0, 1], [1, 0.93]);
  const radius = useTransform(pageCover, [0, 1], [0, 24]);
  const y = useTransform(pageCover, [0, 1], [0, 10]);
  const wide = pathname === "/secure";
  const youreIn = pathname.startsWith("/unlock") && status === "in";

  return (
    <MotionConfig reducedMotion="user" transition={transition("base")}>
      <div style={cssMotionVars} className="leading-[normal]">
        <div aria-hidden="true" className="fixed inset-0 bg-night sm:hidden" />
        <Suspense>
          <Boot />
        </Suspense>
        <motion.div style={{ scale, y, borderRadius: radius }} className="relative flex min-h-dvh flex-col overflow-hidden bg-ground">
          <Header hideBack={youreIn} />
          <main className="flex flex-1 flex-col px-6 pb-[calc(52px+env(safe-area-inset-bottom))] max-sm:justify-center sm:items-center sm:justify-center sm:pt-2 sm:pb-16">
            <div
              className={`w-full max-w-full py-6 sm:rounded-card sm:bg-card sm:px-14 sm:pt-14 sm:pb-12 sm:shadow-card ${wide ? "sm:w-[560px]" : "sm:w-[520px]"}`}
            >
              {access !== "pending" && (
                <Stage id={youreIn ? "in" : pathname}>{youreIn ? <YoureIn /> : children}</Stage>
              )}
            </div>
          </main>
        </motion.div>
        <Toaster placement="bottom" />
      </div>
    </MotionConfig>
  );
}
