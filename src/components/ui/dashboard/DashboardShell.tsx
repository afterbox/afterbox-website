"use client";

import { AnimatePresence, MotionConfig, motion, useIsPresent, useTransform } from "motion/react";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, use, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import BackButton from "@/components/ui/BackButton";
import BrandMark from "@/components/ui/BrandMark";
import { HomeIcon, ListIcon, PeopleIcon, PlusIcon } from "@/components/ui/icons";
import { Link } from "@/components/ui/Links";
import { acceptDue, loadDelay } from "@/lib/dashboard/api";
import { boot, markLoaded, useDashboardState, useLoaded } from "@/lib/dashboard/store";
import { cssMotionVars, distance, pressable, transition } from "@/lib/motion";
import { useMotionTokens } from "@/lib/useMotionTokens";
import { pageCover, useLayerHistory, useLayers } from "./Layer";
import { Toaster } from "./toast";

type Section = "home" | "record" | "people" | "settings";

function sectionOf(pathname: string, from: string | null): Section {
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/people")) return "people";
  if (pathname.startsWith("/record")) return from === "home" ? "home" : "record";
  return "home";
}

const tabs = [
  { section: "home" as const, href: "/home", label: "Home", Icon: HomeIcon },
  { section: "record" as const, href: "/record", label: "Record", Icon: ListIcon },
  { section: "people" as const, href: "/people", label: "People", Icon: PeopleIcon },
];

function useInitials() {
  return useDashboardState()?.account.initials ?? "";
}

/* Desktop and tablet: the icon rail. From 1024px it widens over the page on hover or focus. */

const railLabel =
  "opacity-0 -translate-x-2 [transition:opacity_.2s,translate_.32s_var(--motion-ease)] lg:group-hover/rail:translate-x-0 lg:group-hover/rail:opacity-100 lg:group-hover/rail:[transition-delay:60ms] lg:group-focus-within/rail:translate-x-0 lg:group-focus-within/rail:opacity-100 lg:group-focus-within/rail:[transition-delay:60ms]";

function RailFrame({ section }: { section: Section | null }) {
  const initials = useInitials();
  return (
    <nav
      aria-label="Main"
      className="group/rail fixed inset-y-0 left-0 z-30 flex w-[76px] flex-col gap-1.5 overflow-hidden bg-card px-4 py-6 shadow-[1px_0_0_var(--color-line)] [transition:width_.32s_var(--motion-ease),box-shadow_.32s] max-sm:hidden lg:hover:w-56 lg:hover:shadow-rail lg:focus-within:w-56 lg:focus-within:shadow-rail"
    >
      <Link href="/home" name="rail-logo" className="mb-7 flex h-11 flex-none items-center gap-3 px-1.5 whitespace-nowrap">
        <BrandMark className="block size-8 flex-none" />
        <span className={`text-[22px] font-semibold tracking-[-0.035em] text-ink ${railLabel}`}>afterbox</span>
      </Link>
      {tabs.map(({ section: id, href, label, Icon }) => {
        const active = section === id;
        return (
          <Link
            key={id}
            href={href}
            name={`rail-${id}`}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            className={`flex h-11 flex-none items-center gap-3.5 rounded-full px-3 text-[15px] font-semibold whitespace-nowrap ${pressable} ${
              active ? "bg-mist text-ink-deep" : "text-ink-soft hover:bg-ground hover:text-ink"
            }`}
          >
            <Icon size={20} />
            <span className={railLabel}>{label}</span>
          </Link>
        );
      })}
      <Link
        href="/settings"
        name="rail-settings"
        aria-current={section === "settings" ? "page" : undefined}
        aria-label="Settings"
        className="mt-auto flex h-11 flex-none items-center gap-3 rounded-full px-0.5 whitespace-nowrap"
      >
        <span
          className={`flex size-10 flex-none items-center justify-center rounded-full text-[13px] font-semibold transition-shadow duration-[var(--motion-fast)] ${
            section === "settings" ? "bg-mist text-ink-deep ring-2 ring-ink-deep" : "bg-mist text-ink-deep"
          }`}
        >
          {initials}
        </span>
        <span className={`text-[15px] font-semibold text-ink ${railLabel}`}>Settings</span>
      </Link>
    </nav>
  );
}

function RailWithParams() {
  const pathname = usePathname();
  const from = useSearchParams().get("from");
  return <RailFrame section={sectionOf(pathname, from)} />;
}

function Rail() {
  const pathname = usePathname();
  return (
    <Suspense fallback={<RailFrame section={sectionOf(pathname, null)} />}>
      <RailWithParams />
    </Suspense>
  );
}

/* Phones: the top bar. Home has + and the avatar; Record, People and categories the avatar; an item a back
   chevron and the avatar; settings only a back chevron. */

function Avatar() {
  const initials = useInitials();
  return (
    <Link
      href="/settings"
      name="topbar-settings"
      aria-label="Settings"
      className="-m-[5px] flex size-11 items-center justify-center rounded-full"
    >
      <span className="flex size-[34px] items-center justify-center rounded-full bg-mist text-[11px] font-semibold text-ink-deep">
        {initials}
      </span>
    </Link>
  );
}

function AddButton() {
  const { open } = useLayers();
  return (
    <button
      type="button"
      aria-label="Add something"
      onClick={() => open("add")}
      className={`-m-[5px] flex size-11 cursor-pointer items-center justify-center rounded-full ${pressable}`}
    >
      <span className="flex size-[34px] items-center justify-center rounded-full bg-ink-deep text-on-night">
        <PlusIcon size={16} strokeWidth={2.6} />
      </span>
    </button>
  );
}

function backFor(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "settings") return parts.length > 1 ? "/settings" : "/home";
  return `/${parts.slice(0, -1).join("/")}`;
}

function TopBar({ pathname }: { pathname: string }) {
  const parts = pathname.split("/").filter(Boolean);
  const settings = parts[0] === "settings";
  const item = parts[0] === "record" && parts.length === 3;
  const wordmark = !settings && !item;

  return (
    <header className="flex h-[calc(52px+env(safe-area-inset-top))] flex-none items-center justify-between bg-ground px-6 pt-[env(safe-area-inset-top)] sm:hidden">
      {wordmark ? (
        <Link href="/home" name="topbar-wordmark" className="text-[22px] font-semibold tracking-[-0.035em] text-ink">
          afterbox
        </Link>
      ) : (
        <BackButton fallbackHref={backFor(pathname)} />
      )}
      {!settings && (
        <span className="flex items-center gap-2.5">
          {pathname === "/home" && (
            <Suspense fallback={<span className="size-[34px]" />}>
              <AddButton />
            </Suspense>
          )}
          <Avatar />
        </span>
      )}
    </header>
  );
}

function TabsFrame({ section }: { section: Section }) {
  return (
    <nav
      aria-label="Main"
      className="flex flex-none border-t border-line bg-card pt-2.5 pb-[max(14px,env(safe-area-inset-bottom))] sm:hidden"
    >
      {tabs.map(({ section: id, href, label, Icon }) => {
        const active = section === id;
        return (
          <Link
            key={id}
            href={href}
            name={`tab-${id}`}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors duration-[var(--motion-fast)] ${
              active ? "text-ink-deep" : "text-ink-soft/70"
            }`}
          >
            <Icon size={22} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function TabsWithParams({ pathname }: { pathname: string }) {
  const from = useSearchParams().get("from");
  return <TabsFrame section={sectionOf(pathname, from)} />;
}

function Tabs({ pathname }: { pathname: string }) {
  if (pathname.startsWith("/settings")) return null;
  return (
    <Suspense fallback={<TabsFrame section={sectionOf(pathname, null)} />}>
      <TabsWithParams pathname={pathname} />
    </Suspense>
  );
}

/* Route changes: the old page fades out, the new one fades in and rises 12px. Rail and tabs stay. */

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

function Stage({ pathname, children }: { pathname: string; children: ReactNode }) {
  const { move } = useMotionTokens();
  // Next keeps this layout alive but hidden while you're elsewhere; coming back starts afresh.
  const [visit, setVisit] = useState(0);
  useLayoutEffect(() => () => setVisit((count) => count + 1), []);

  return (
    <AnimatePresence key={visit} mode="wait" initial={false}>
      <motion.div
        key={pathname}
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

/* The page behind a phone sheet: scales to 0.93, rounds its corners; black shows around it. */

function PageFrame({ pathname, children }: { pathname: string; children: ReactNode }) {
  const scale = useTransform(pageCover, [0, 1], [1, 0.93]);
  const radius = useTransform(pageCover, [0, 1], [0, 24]);
  const y = useTransform(pageCover, [0, 1], [0, 10]);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <motion.div
      style={{ scale, y, borderRadius: radius }}
      className="relative bg-ground max-sm:flex max-sm:h-dvh max-sm:flex-col max-sm:overflow-hidden"
    >
      <TopBar pathname={pathname} />
      <main ref={mainRef} data-scroller className="min-h-dvh max-sm:min-h-0 max-sm:flex-1 max-sm:overflow-y-auto max-sm:overscroll-contain sm:pl-[76px]">
        {children}
      </main>
      <Tabs pathname={pathname} />
    </motion.div>
  );
}

/* Boot: ?mock= and ?start=, seeding, the first-load delay, and the mock's invite timer. */

function Boot() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const loaded = useLoaded();

  useEffect(() => {
    const used = boot(params);
    if (used.length > 0) {
      const next = new URLSearchParams(params.toString());
      used.forEach((key) => next.delete(key));
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [params, pathname, router]);

  useEffect(() => {
    if (loaded) return;
    let cancelled = false;
    loadDelay().then(() => {
      if (!cancelled) markLoaded();
    });
    return () => {
      cancelled = true;
    };
  }, [loaded]);

  useEffect(() => {
    const interval = setInterval(() => acceptDue(), 1000);
    return () => clearInterval(interval);
  }, []);

  useLayerHistory();
  return null;
}

/**
 * Desktop and tablet: the rail on the left and the window scrolls. Phones: a viewport-high frame with the
 * top bar, a scrolling main and the tabs, so sheets can scale it back like iOS.
 */
export default function DashboardShell({ overlays, children }: { overlays: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <MotionConfig reducedMotion="user" transition={transition("base")}>
      <div style={cssMotionVars} className="leading-[normal]">
        <div aria-hidden="true" className="fixed inset-0 bg-night sm:hidden" />
        <Suspense>
          <Boot />
        </Suspense>
        <Rail />
        <PageFrame pathname={pathname}>
          <Stage pathname={pathname}>{children}</Stage>
        </PageFrame>
        <Suspense>{overlays}</Suspense>
        <Toaster />
      </div>
    </MotionConfig>
  );
}
