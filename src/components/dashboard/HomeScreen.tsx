"use client";

import { motion } from "motion/react";
import { useRef } from "react";
import Button from "@/components/ui/Button";
import { LockIcon, PlusIcon } from "@/components/ui/icons";
import { AnimatedNumber } from "@/components/ui/onboarding/Motion";
import { Events, FindsBanner, NextUp, SavedSoFar, Tile, useDocumentPicker } from "@/components/ui/dashboard/home";
import { useLayers } from "@/components/ui/dashboard/Layer";
import Page from "@/components/ui/dashboard/Page";
import Ready from "@/components/ui/dashboard/Ready";
import { HomeSkeleton } from "@/components/ui/dashboard/Skeleton";
import type { Home, HomeBank } from "@/lib/api/types";
import { formatList, timeAgo } from "@/lib/dashboard/format";
import { distance, duration, stagger, transition } from "@/lib/motion";
import { useMotionTokens } from "@/lib/useMotionTokens";
import { canMarkSeen, useMarkEventSeen } from "@/store/activity";
import { useStartScan } from "@/store/documents";
import { useHome } from "@/store/home";

/** "Checked with Monzo and HSBC 2 hours ago", from Home's own `banks` (no extra request). */
function SafeLine({ banks }: { banks: HomeBank[] }) {
  const latest = banks.reduce((newest, bank) => Math.max(newest, bank.checkedAt ? Date.parse(bank.checkedAt) : 0), 0);
  const ago = latest ? timeAgo(latest) : null;
  const names = formatList(banks.map((bank) => bank.name));
  const icon = <LockIcon size={14} className="flex-none text-positive" />;
  const line = "mt-3.5 flex items-center gap-[7px] text-[13px] text-ink-soft";
  return (
    <>
      <p className={`${line} sm:hidden`}>
        {icon}
        {!ago ? "Saved and encrypted" : banks.length > 1 ? `Checked with your banks ${ago}` : `Saved and encrypted · Checked ${ago}`}
      </p>
      <p className={`${line} max-sm:hidden`}>
        {icon}
        {ago ? `Saved and encrypted · Checked with ${names} ${ago}` : "Saved and encrypted"}
      </p>
    </>
  );
}

function HomeView({ home }: { home: Home }) {
  const { open } = useLayers();
  const { move } = useMotionTokens();
  const markSeen = useMarkEventSeen();
  const documentFor = useRef<string | null>(null);
  const startScan = useStartScan();
  const picker = useDocumentPicker((file) => {
    if (!documentFor.current) return;
    startScan(file, documentFor.current);
    open("scan", { item: documentFor.current });
  });

  const hasBanner = home.newFinds.count > 0;
  // "What's new" when there's any, else "Coming up".
  const newsFirst = home.whatsNew.length > 0;
  const events = newsFirst ? home.whatsNew : home.comingUp;
  const eventsTitle = newsFirst ? "What’s new" : "Coming up";
  const tilesDone = duration.slow + home.categories.length * stagger.base;
  const after = (step: number) => ({
    initial: { opacity: 0, y: move(distance.rise) },
    animate: { opacity: 1, y: 0 },
    transition: transition("base", tilesDone + step * stagger.base),
  });
  const saved = home.savedSoFar?.yearly.filter((money) => money.minor > 0) ?? [];

  return (
    <Page width="wide">
      {picker.input}
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-x-16">
        <div className="contents lg:block">
          <div className="order-1 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 tabIndex={-1} className="flex flex-wrap items-baseline gap-x-3 text-ink outline-none">
                <span className="text-[52px]/none tracking-[-0.045em] tabular-nums sm:text-[64px]/none" data-testid="home-count">
                  <AnimatedNumber value={home.count} from={0} speed="slow" />
                </span>
                <span className="text-[17px] sm:text-[20px]">in your record</span>
              </h1>
              <SafeLine banks={home.banks} />
            </div>
            <Button variant="inkDeep" size="add" onClick={() => open("add")} className="flex-none max-sm:hidden">
              <PlusIcon size={16} strokeWidth={2.4} />
              Add
            </Button>
          </div>

          {hasBanner && (
            <motion.div {...after(0)} className="order-2 mt-6 sm:mt-8">
              <FindsBanner count={home.newFinds.count} line={home.newFinds.line} onReview={() => open("review")} />
            </motion.div>
          )}
          {home.waiting > 0 && (
            <motion.p {...after(0)} className={`order-2 text-[13px] text-ink-soft ${hasBanner ? "mt-2.5" : "mt-6"}`}>
              {home.waiting} more waiting. Your plan has room for what’s in your record now.
            </motion.p>
          )}

          {home.categories.length > 0 && (
            <section aria-label="Your record" className={`order-5 mt-9 ${hasBanner ? "lg:mt-8" : "lg:mt-9"}`}>
              <h2 className="mb-3 text-[15px] font-semibold text-ink lg:hidden">Your record</h2>
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
                {home.categories.map((summary, index) => (
                  <Tile key={summary.id} summary={summary} delay={duration.fast + index * stagger.base} />
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="contents lg:block">
          {home.nextUp.length > 0 && (
            <motion.div {...after(1)} className={`order-3 ${hasBanner ? "mt-4 sm:mt-8" : "mt-7 sm:mt-8"} lg:mt-0`}>
              <NextUp
                tasks={home.nextUp}
                onChoose={() => open("invite")}
                onDocument={(item) => {
                  documentFor.current = item.id;
                  picker.pick();
                }}
              />
            </motion.div>
          )}

          {events.length > 0 && (
            <motion.div
              {...after(2)}
              className={`${newsFirst ? "order-4" : "order-6 sm:order-4"} ${newsFirst ? "mt-7" : "mt-9 sm:mt-10"} sm:mt-10 ${
                home.nextUp[0]?.kind === "person" ? "lg:mt-8" : "lg:mt-10"
              }`}
            >
              <Events
                events={events}
                title={eventsTitle}
                delay={tilesDone + 2 * stagger.base}
                onOpen={(event) => {
                  if (!event.upcoming && canMarkSeen(event.id)) markSeen.mutate(event.id);
                }}
              />
            </motion.div>
          )}

          {saved.length > 0 && (
            <motion.div {...after(3)} className="mt-8 max-lg:hidden">
              <SavedSoFar yearly={saved} />
            </motion.div>
          )}
        </div>
      </div>
    </Page>
  );
}

export default function HomeScreen() {
  const query = useHome();
  return (
    <Ready query={query} skeleton={<HomeSkeleton />}>
      {(home) => <HomeView home={home} />}
    </Ready>
  );
}
