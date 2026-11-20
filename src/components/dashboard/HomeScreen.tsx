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
import { getHome } from "@/lib/dashboard/api";
import { formatList, timeAgo } from "@/lib/dashboard/format";
import type { DashboardState } from "@/lib/dashboard/mock";
import { distance, duration, stagger, transition } from "@/lib/motion";
import { useMotionTokens } from "@/lib/useMotionTokens";

function SafeLine({ banks }: { banks: DashboardState["banks"] }) {
  const latest = banks.reduce((newest, bank) => Math.max(newest, bank.checkedAt), 0);
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

function Home({ state }: { state: DashboardState }) {
  const home = getHome(state);
  const { open } = useLayers();
  const { move } = useMotionTokens();
  const documentFor = useRef<string | null>(null);
  const picker = useDocumentPicker(() => {
    if (documentFor.current) open("scan", { item: documentFor.current });
  });

  const hasBanner = home.finds.length > 0;
  const tilesDone = duration.slow + home.categories.length * stagger.base;
  const after = (step: number) => ({
    initial: { opacity: 0, y: move(distance.rise) },
    animate: { opacity: 1, y: 0 },
    transition: transition("base", tilesDone + step * stagger.base),
  });
  const newsFirst = home.eventsTitle !== "Coming up";

  return (
    <Page width="wide">
      {picker.input}
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-x-16">
        <div className="contents lg:block">
          <div className="order-1 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 tabIndex={-1} className="flex flex-wrap items-baseline gap-x-3 text-ink outline-none">
                <span className="text-[52px]/none tracking-[-0.045em] tabular-nums sm:text-[64px]/none">
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
              <FindsBanner finds={home.finds} onReview={() => open("review")} />
            </motion.div>
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
          {home.tasks.length > 0 && (
            <motion.div {...after(1)} className={`order-3 ${hasBanner ? "mt-4 sm:mt-8" : "mt-7 sm:mt-8"} lg:mt-0`}>
              <NextUp
                tasks={home.tasks}
                onChoose={() => open("invite")}
                onDocument={(item) => {
                  documentFor.current = item.id;
                  picker.pick();
                }}
              />
            </motion.div>
          )}

          {home.events.length > 0 && (
            <motion.div
              {...after(2)}
              className={`${newsFirst ? "order-4" : "order-6 sm:order-4"} ${newsFirst ? "mt-7" : "mt-9 sm:mt-10"} sm:mt-10 ${
                home.tasks[0]?.kind === "person" ? "lg:mt-8" : "lg:mt-10"
              }`}
            >
              <Events events={home.events} title={home.eventsTitle} delay={tilesDone + 2 * stagger.base} />
            </motion.div>
          )}

          {home.savedYearly > 0 && (
            <motion.div {...after(3)} className="mt-8 max-lg:hidden">
              <SavedSoFar yearly={home.savedYearly} />
            </motion.div>
          )}
        </div>
      </div>
    </Page>
  );
}

export default function HomeScreen() {
  return <Ready skeleton={<HomeSkeleton />}>{(state) => <Home state={state} />}</Ready>;
}
