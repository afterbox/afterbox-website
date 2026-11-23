"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import FormMessage from "@/components/ui/FormMessage";
import { BankIcon, ChevronRightIcon, CloseIcon, PlusIcon, ShareIcon } from "@/components/ui/icons";
import { Link } from "@/components/ui/Links";
import CategoryList from "@/components/ui/onboarding/CategoryList";
import FlagTile from "@/components/ui/onboarding/FlagTile";
import IconSquare from "@/components/ui/onboarding/IconSquare";
import { AnimatedNumber, Collapse, useReveal } from "@/components/ui/onboarding/Motion";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import ScreenTitle, { ScreenLead } from "@/components/ui/onboarding/ScreenTitle";
import { FoundSkeleton } from "@/components/ui/onboarding/Skeletons";
import { errorCopy } from "@/lib/api/errors";
import { duration, pressable, stagger } from "@/lib/motion";
import { useRenewBank } from "@/store/banks";
import { useMe } from "@/store/me";
import { useAcceptAll, useFound, usePrefetchFoundCategory } from "@/store/onboarding";

/** Fewer than this and the results drop to one column with no flags (14). */
const FEW_THINGS = 6;
const ADD_BANK_HREF = "/connect/bank?another=1";

const MotionLink = motion.create(Link);

const bankNames = new Intl.ListFormat("en-GB", { type: "conjunction" });

function share(count: number) {
  if (!navigator.share) return;
  navigator.share({ title: "afterbox", text: `afterbox found ${count} things I own or pay for.`, url: window.location.origin }).catch(() => {});
}

/** 08, 14 (few things), 17 (two banks) and 18 (latest bank failed). "Add all" stages the finds; locking makes them items. */
export default function FoundScreen() {
  const router = useRouter();
  const found = useFound();
  const me = useMe();
  const acceptAll = useAcceptAll();
  const renew = useRenewBank();
  const prefetchCategory = usePrefetchFoundCategory();
  const reveal = useReveal();
  const keysReady = me.data?.keysReady ?? false;

  useEffect(() => {
    router.prefetch("/secure");
    router.prefetch("/connect/bank");
  }, [router]);

  const data = found.data;
  const nothingRead = Boolean(data && data.sources.length === 0 && data.count === 0 && !data.failedBank);

  // Straight after a read the found route can lag the progress route for a moment: keep asking for a while
  // before deciding nothing was read (then back to the bank picker).
  const [patience] = useState(() => Date.now() + 30_000);
  const { refetch } = found;
  useEffect(() => {
    if (!nothingRead) return;
    if (Date.now() > patience) {
      router.replace("/connect/bank");
      return;
    }
    const timer = setTimeout(() => refetch(), 2000);
    return () => clearTimeout(timer);
  }, [nothingRead, patience, refetch, router, found.dataUpdatedAt]);

  if (found.isPending || nothingRead) {
    return (
      <OnboardingCard size="results">
        <FoundSkeleton />
      </OnboardingCard>
    );
  }

  if (found.isError || !data) {
    return (
      <OnboardingCard>
        <ScreenTitle className="mb-2">We couldn’t load what we found</ScreenTitle>
        <ScreenLead className="mb-[34px]">{found.error ? errorCopy(found.error) : "Try again in a moment."}</ScreenLead>
        <Button variant="inkDeep" size="block" onClick={() => found.refetch()}>
          Try again
        </Button>
      </OnboardingCard>
    );
  }

  const few = data.count < FEW_THINGS;
  const latest = data.latestBank;
  const flags = few ? [] : data.flags;

  // The count rises first; then the new-bank marks pop in and everything below follows, a step apart.
  const counted = duration.slow;
  const after = (index: number) => counted + index * stagger.base;
  const categoriesFrom = after(flags.length > 0 ? flags.length + 1 : 0);
  const restFrom = after((flags.length > 0 ? flags.length + 1 : 0) + data.categories.length);

  function addAll() {
    acceptAll.mutate(undefined, { onSuccess: () => router.push(keysReady ? "/home" : "/secure") });
  }

  return (
    <OnboardingCard size={few ? "default" : "results"}>
      <Collapse show={Boolean(data.failedBank)} drop initial>
        <div className="mb-8 flex items-center gap-2.5 rounded-panel border border-alert/16 bg-alert/6 px-3.5 py-3 text-sm/[normal] text-ink">
          <CloseIcon size={16} className="text-alert" />
          <span className="flex-1">{data.failedBank?.name} wasn’t connected</span>
          <button
            type="button"
            disabled={renew.isPending}
            onClick={() => data.failedBank && renew.mutate(data.failedBank.connectionId, { onSuccess: (url) => window.location.assign(url) })}
            className={`cursor-pointer font-semibold text-ink ${pressable}`}
          >
            Try again
          </button>
        </div>
      </Collapse>

      <div className="relative">
        <button
          type="button"
          aria-label="Share"
          onClick={() => share(data.count)}
          className="absolute -top-1.5 -right-1.5 flex size-10 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:text-ink"
        >
          <ShareIcon size={19} />
        </button>
        <p className="mb-1.5 text-center text-[13px] text-ink-soft">
          {data.sources.length > 1 ? `From ${bankNames.format(data.sources)}` : "Found in 2 years of transactions"}
        </p>
        <h1 tabIndex={-1} className="text-center text-[48px]/none font-normal tracking-[-0.045em] text-ink outline-none sm:text-[56px]/none">
          <AnimatedNumber value={data.count} from={0} speed="slow" /> {data.count === 1 ? "thing" : "things"}
        </h1>
        <p className={`mt-1.5 text-center text-[15px] text-ink-soft ${latest && latest.added > 0 ? "mb-4" : "mb-9"}`}>you own or pay for</p>
        {latest && latest.added > 0 && (
          <p className="mb-9 flex justify-center">
            <motion.span
              {...reveal.pop(counted)}
              className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-positive/8 px-3 text-[13px] font-semibold text-positive"
            >
              <PlusIcon size={13} strokeWidth={2.4} />
              {latest.added} from {latest.name}
            </motion.span>
          </p>
        )}
      </div>

      {flags.length > 0 && (
        <>
          <motion.h2 {...reveal.rise(after(0))} className="mb-2 text-xs/[normal] font-semibold tracking-[0.04em] text-warn">
            WORTH A LOOK
          </motion.h2>
          <ul className="mb-[34px] flex flex-col gap-2.5 sm:grid sm:grid-cols-2">
            {flags.map((flag, index) => (
              <motion.li key={flag.id} {...reveal.rise(after(index + 1))}>
                <FlagTile flag={flag} />
              </motion.li>
            ))}
          </ul>
        </>
      )}

      <CategoryList
        rows={data.categories}
        addedFrom={latest?.name}
        columns={!few}
        enterDelay={categoriesFrom}
        marksDelay={counted}
        onIntent={prefetchCategory}
      />

      {few && (
        <MotionLink
          {...reveal.rise(restFrom)}
          href={ADD_BANK_HREF}
          name="found-add-bank-tile"
          className={`group mb-7 flex items-center gap-3.5 rounded-panel border border-line bg-ground px-[18px] py-4 ${pressable}`}
        >
          <IconSquare size="lg">
            <BankIcon size={19} />
          </IconSquare>
          <span className="flex-1">
            <span className="block text-[15px] text-ink">Bills paid from another account?</span>
            <span className="mt-[3px] block text-[13px] text-ink-soft">Add that bank to find the rest</span>
          </span>
          <ChevronRightIcon size={16} className="text-ink-soft/70 transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] group-hover:text-ink" />
        </MotionLink>
      )}

      <motion.div {...reveal.rise(restFrom + (few ? stagger.base : 0))}>
        <Button variant="inkDeep" size="block" loading={acceptAll.isPending} loadingLabel="Adding" onClick={addAll}>
          Add all to my record
        </Button>
        <FormMessage message={acceptAll.isError ? errorCopy(acceptAll.error) : null} gapClassName="pt-3" />
      </motion.div>

      {!few && (
        <motion.p
          {...reveal.rise(restFrom + stagger.base)}
          className="mt-[18px] flex flex-wrap items-center justify-center gap-x-1.5 text-center text-[13px] text-ink-soft sm:text-sm/[normal]"
        >
          Bills paid from another account?
          <Link href={ADD_BANK_HREF} name="found-add-bank" className="font-semibold text-ink">
            Add that bank
          </Link>
        </motion.p>
      )}
    </OnboardingCard>
  );
}
