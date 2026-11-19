"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion, useIsPresent, type Variants } from "motion/react";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Suspense,
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import BackButton from "@/components/ui/BackButton";
import { OnboardingProvider, useHydrated, useOnboarding, type OnboardingState } from "@/lib/onboarding/store";
import { cssMotionVars, distance, transition } from "@/lib/motion";
import { useMotionTokens } from "@/lib/useMotionTokens";

type HeaderSetup = { step: 1 | 2 | 3; backHref: string | null };

/** Which progress step each screen is on, and where Back falls back to (null hides it). */
function headerFor(pathname: string, another: boolean, state: OnboardingState): HeaderSetup {
  const connectingAnother = state.pending?.another ?? false;
  const [, section, page, flag, cancel] = pathname.split("/");

  if (section === "connect") {
    switch (page) {
      case undefined:
        return { step: 1, backHref: "/start" };
      case "bank":
        return another ? { step: 3, backHref: "/found" } : { step: 1, backHref: "/connect" };
      case "reading":
        return { step: state.banks.length > 1 ? 3 : 2, backHref: null };
      case "cancelled":
        return { step: connectingAnother ? 3 : 1, backHref: connectingAnother ? "/connect/bank?another=1" : "/connect/bank" };
      case "thin":
        return { step: 3, backHref: null };
      default:
        return { step: connectingAnother ? 3 : 1, backHref: null };
    }
  }
  if (section === "found") {
    if (!page) return { step: 3, backHref: null };
    if (page === "look") return { step: 3, backHref: cancel ? `/found/look/${flag}` : "/found" };
    return { step: 3, backHref: "/found" };
  }
  if (section === "add") return page ? { step: 3, backHref: "/add" } : { step: 1, backHref: "/connect" };
  return { step: 1, backHref: null };
}

function Progress({ step }: { step: number }) {
  const { resize } = useMotionTokens();
  return (
    <motion.div
      role="progressbar"
      aria-label="Setup progress"
      aria-valuemin={1}
      aria-valuemax={3}
      aria-valuenow={step}
      aria-valuetext={`Step ${step} of 3`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={transition("base")}
      className="flex w-[120px] gap-1.5 sm:w-40"
    >
      {[1, 2, 3].map((segment) => {
        const filled = segment <= step;
        return (
          <span key={segment} className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
            <motion.span
              className="block h-full rounded-full"
              initial={false}
              animate={{
                width: filled ? "100%" : "0%",
                backgroundColor: filled ? "var(--color-ink-deep)" : "var(--color-line)",
              }}
              transition={resize("base")}
            />
          </span>
        );
      })}
    </motion.div>
  );
}

function HeaderFrame({ setup }: { setup: HeaderSetup | null }) {
  return (
    <header className="grid h-[52px] shrink-0 grid-cols-[40px_1fr_40px] items-center px-5 sm:h-[88px] sm:grid-cols-[1fr_auto_1fr] sm:px-10">
      <Link
        href="/"
        className="col-start-1 row-start-1 text-[26px] font-semibold tracking-[-0.035em] text-ink max-sm:hidden"
      >
        afterbox
      </Link>
      <div className="col-start-2 row-start-1 flex justify-center">{setup && <Progress step={setup.step} />}</div>
      <AnimatePresence initial={false}>
        {setup?.backHref && (
          <motion.div
            key="back"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition("fast")}
            className="col-start-1 row-start-1 max-sm:ml-0.5 sm:col-start-3 sm:justify-self-end"
          >
            <BackButton fallbackHref={setup.backHref} />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Header() {
  const pathname = usePathname();
  const another = useSearchParams().get("another") === "1";
  const { state } = useOnboarding();
  return <HeaderFrame setup={useHydrated() ? headerFor(pathname, another, state) : null} />;
}

const DESKTOP = "(min-width: 640px)";

function subscribeToDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** From 640px the screen sits in a card; below, straight on the page. */
function useDesktop() {
  return useSyncExternalStore(
    subscribeToDesktop,
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

/** Lets each screen's content re-place the card once it has mounted. */
const CardContext = createContext<() => void>(() => {});

/** Called by OnboardingCard: puts the card where it would sit centred, then leaves it there. */
export function usePlaceCard() {
  const place = use(CardContext);
  useLayoutEffect(() => place(), [place]);
}

/**
 * While a screen animates out, the router has already moved on. Holding the router context
 * it had keeps the old screen on show until it's gone.
 */
function FrozenRouter({ children }: { children: ReactNode }) {
  const context = use(LayoutRouterContext);
  const isPresent = useIsPresent();
  const [frozen, setFrozen] = useState(context);
  if (isPresent && frozen !== context) setFrozen(context);
  return <LayoutRouterContext value={isPresent ? context : frozen}>{children}</LayoutRouterContext>;
}

/** Moves focus to the new screen's title, as a page load would. */
function FocusTitle({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div ref={ref}>{children}</div>;
}

const isGuide = (pathname: string | null) => pathname?.includes("/cancel/") ?? false;

type Change = "rise" | "slide";

/**
 * The card stays put between routes and animates its size; only what's inside changes.
 * Old content fades out, then the new content fades in and rises (or, from one cancel guide
 * to the next, slides across). The card keeps its top where it first sat centred, so screens
 * that change size grow and shrink downwards instead of jumping about.
 */
function Stage({ ready, children }: { ready: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const desktop = useDesktop();
  const { move } = useMotionTokens();
  const mainRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);
  const [radius, setRadius] = useState<number>();
  const [paths, setPaths] = useState({ current: pathname, previous: null as string | null });
  if (paths.current !== pathname) setPaths({ current: pathname, previous: paths.current });
  const change: Change = isGuide(paths.previous) && isGuide(pathname) ? "slide" : "rise";

  const place = useCallback(() => {
    const main = mainRef.current;
    const card = cardRef.current;
    if (!main || !card || !window.matchMedia(DESKTOP).matches) {
      setOffset(0);
      return;
    }
    const style = getComputedStyle(main);
    const space = window.innerHeight - main.offsetTop - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    setOffset(Math.max(0, Math.round((space - card.offsetHeight) / 2)));
  }, []);

  // On first mount the card's ref attaches after the first screen has asked to be placed.
  useLayoutEffect(() => place(), [place, desktop]);

  useEffect(() => {
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [place]);

  // Motion keeps corners true while the card scales, given the radius as a number.
  useLayoutEffect(() => {
    if (desktop && cardRef.current) setRadius(parseFloat(getComputedStyle(cardRef.current).borderTopLeftRadius));
  }, [desktop]);

  const variants: Variants = {
    enter: (kind: Change) =>
      kind === "slide" ? { opacity: 0, x: move(distance.slide) } : { opacity: 0, y: move(distance.rise) },
    shown: { opacity: 1, x: 0, y: 0, transition: transition("base") },
    exit: (kind: Change) =>
      kind === "slide"
        ? { opacity: 0, x: -move(distance.slide), transition: transition("fast") }
        : { opacity: 0, transition: transition("fast") },
  };

  return (
    <main ref={mainRef} className="flex flex-1 flex-col sm:px-6 sm:pt-2 sm:pb-9">
      <div className="flex flex-1 flex-col sm:items-center" style={{ paddingTop: desktop ? offset : undefined }}>
        <CardContext value={place}>
          <LayoutGroup>
            <motion.section
              ref={cardRef}
              layout={desktop}
              initial={{ opacity: 0 }}
              animate={{ opacity: ready ? 1 : 0 }}
              transition={transition("base")}
              style={desktop && radius !== undefined ? { borderRadius: radius } : undefined}
              className="sm:max-w-full sm:rounded-card sm:bg-card sm:shadow-card"
            >
              <AnimatePresence mode="wait" custom={change}>
                <motion.div
                  key={pathname}
                  layout={desktop}
                  custom={change}
                  variants={variants}
                  initial="enter"
                  animate={ready ? "shown" : "enter"}
                  exit="exit"
                  transition={transition("base")}
                >
                  <FrozenRouter>
                    <FocusTitle>{children}</FocusTitle>
                  </FrozenRouter>
                </motion.div>
              </AnimatePresence>
            </motion.section>
          </LayoutGroup>
        </CardContext>
      </div>
    </main>
  );
}

/**
 * Mobile: full screen, progress centred, Back on the left. From 640px: wordmark on the left,
 * Back on the right, and each screen sits in the card.
 * The state lives in sessionStorage, so screens render nothing until it has loaded (AfterHydration)
 * and the card stays transparent until then; then the first screen comes in like any other.
 */
export default function OnboardingShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  return (
    <MotionConfig reducedMotion="user" transition={transition("base")}>
      <div className="flex min-h-dvh flex-col leading-[normal]" style={cssMotionVars}>
        <OnboardingProvider>
          <Suspense fallback={<HeaderFrame setup={null} />}>
            <Header />
          </Suspense>
          <Stage ready={hydrated}>{children}</Stage>
        </OnboardingProvider>
      </div>
    </MotionConfig>
  );
}
