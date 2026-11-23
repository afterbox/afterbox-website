"use client";

import { AnimatePresence, MotionConfig, motion, useIsPresent, useTransform } from "motion/react";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, use, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { pageCover, useLayerHistory } from "@/components/ui/dashboard/Layer";
import { Toaster } from "@/components/ui/dashboard/toast";
import { safeNext } from "@/components/security/SecureScreen";
import { withNext } from "@/lib/afterSignIn";
import { cssMotionVars, distance, pressable, transition } from "@/lib/motion";
import { useMotionTokens } from "@/lib/useMotionTokens";
import { useMe } from "@/store/me";
import SessionBridge from "@/store/SessionBridge";
import { useRecordAccess } from "@/store/unlock";

/** Phones: which screens have a back chevron (06, 09, 10, 13), and where it falls back to. */
function backFor(pathname: string, params: URLSearchParams) {
  if (pathname === "/unlock") return params.has("wait") ? "/unlock" : null;
  if (pathname === "/unlock/ask" && params.has("sent")) return null;
  if (pathname.startsWith("/unlock/")) return "/unlock";
  return null;
}

function Initials() {
  const initials = useMe().data?.initials ?? "";
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

/** Sends people where they belong: no keys yet → /secure; the record already open on /unlock → on to it. */
function Boot() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();
  const access = useRecordAccess(pathname.startsWith("/unlock") ? me.data : undefined);
  const unlocking = pathname.startsWith("/unlock");
  // Screens on /unlock finish their own way in (08, help); only a plain visit moves on by itself.
  const busy = params.has("wait") || params.has("request") || pathname === "/unlock/code";

  useEffect(() => {
    if (!unlocking || !me.data || busy) return;
    if (!me.data.keysReady) router.replace(withNext("/secure", params.get("next")));
    else if (access === "open") router.replace(safeNext(params.get("next")));
  }, [access, busy, me.data, params, router, unlocking]);

  useEffect(() => {
    if (unlocking) router.prefetch("/home");
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
  const me = useMe();
  const scale = useTransform(pageCover, [0, 1], [1, 0.93]);
  const radius = useTransform(pageCover, [0, 1], [0, 24]);
  const y = useTransform(pageCover, [0, 1], [0, 10]);
  const wide = pathname === "/secure";

  return (
    <MotionConfig reducedMotion="user" transition={transition("base")}>
      <div style={cssMotionVars} className="leading-[normal]">
        <div aria-hidden="true" className="fixed inset-0 bg-night sm:hidden" />
        <SessionBridge />
        <Suspense>
          <Boot />
        </Suspense>
        <motion.div style={{ scale, y, borderRadius: radius }} className="relative flex min-h-dvh flex-col overflow-hidden bg-ground">
          <Header hideBack={false} />
          <main className="flex flex-1 flex-col px-6 pb-[calc(52px+env(safe-area-inset-bottom))] max-sm:justify-center sm:items-center sm:justify-center sm:pt-2 sm:pb-16">
            <div
              className={`w-full max-w-full py-6 sm:rounded-card sm:bg-card sm:px-14 sm:pt-14 sm:pb-12 sm:shadow-card ${wide ? "sm:w-[560px]" : "sm:w-[520px]"}`}
            >
              {me.data && <Stage id={pathname}>{children}</Stage>}
            </div>
          </main>
        </motion.div>
        <Toaster placement="bottom" />
      </div>
    </MotionConfig>
  );
}
