"use client";

import { motion } from "motion/react";
import { Link } from "@/components/ui/Links";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { BankIcon, ChevronRightIcon, CloseIcon, PlusIcon, ShareIcon } from "@/components/ui/icons";
import CategoryList, { type CategorySummary } from "@/components/ui/onboarding/CategoryList";
import FlagTile from "@/components/ui/onboarding/FlagTile";
import IconSquare from "@/components/ui/onboarding/IconSquare";
import { AnimatedNumber, Collapse, useReveal } from "@/components/ui/onboarding/Motion";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import { duration, pressable, stagger } from "@/lib/motion";
import { sum } from "@/lib/onboarding/format";
import { getBank, getCategories } from "@/lib/onboarding/mock";
import { useFindings, useOnboarding } from "@/lib/onboarding/store";

/** Fewer than this and the results drop to one column with no flags (14). */
const FEW_THINGS = 6;
const ADD_BANK_HREF = "/connect/bank?another=1";

const MotionLink = motion.create(Link);

const bankNames = new Intl.ListFormat("en-GB", { type: "conjunction" });

function share(count: number) {
  if (!navigator.share) return;
  navigator
    .share({ title: "afterbox", text: `afterbox found ${count} things I own or pay for.`, url: window.location.origin })
    .catch(() => { });
}

/** 08, 14 (few things), 17 (two banks) and 18 (second bank failed). */
export default function FoundScreen() {
  const router = useRouter();
  const { state, actions } = useOnboarding();
  const { findings, flags, isCancelled } = useFindings();
  const banks = state.banks.flatMap((bank) => getBank(bank.id) ?? []);
  const newest = banks.length > 1 ? banks[banks.length - 1] : null;
  const added = newest ? findings.filter((finding) => finding.bankId === newest.id) : [];
  const failedBank = getBank(state.failedBankId);
  const few = findings.length < FEW_THINGS;
  const reveal = useReveal();

  useEffect(() => {
    router.prefetch("/connect/opening");
    router.prefetch("/connect/bank");
  }, [router]);

  useEffect(() => {
    if (banks.length === 0) router.replace("/connect/bank");
  }, [banks.length, router]);

  if (banks.length === 0) return null;

  const rows: CategorySummary[] = getCategories().flatMap((category) => {
    const items = findings.filter((finding) => finding.category === category.id);
    if (items.length === 0) return [];
    return {
      category,
      count: items.length,
      added: added.filter((finding) => finding.category === category.id).length,
      addedFrom: newest?.name,
      monthly: sum(items.filter((item) => !isCancelled(item.id)).map((item) => item.monthly)),
    };
  });

  // The count rises first; then the new-bank marks pop in and everything below follows, a step apart.
  const counted = duration.slow;
  const flagCount = !few ? flags.length : 0;
  const after = (index: number) => counted + index * stagger.base;
  const categoriesFrom = after(flagCount > 0 ? flagCount + 1 : 0);
  const restFrom = after((flagCount > 0 ? flagCount + 1 : 0) + rows.length);

  function retry() {
    actions.retryFailed();
    router.push("/connect/opening");
  }

  return (
    <OnboardingCard size={few ? "default" : "results"}>
      <Collapse show={failedBank !== null} drop initial>
        <div className="mb-8 flex items-center gap-2.5 rounded-panel border border-alert/16 bg-alert/6 px-3.5 py-3 text-sm/[normal] text-ink">
          <CloseIcon size={16} className="text-alert" />
          <span className="flex-1">{failedBank?.name} wasn’t connected</span>
          <button type="button" onClick={retry} className={`cursor-pointer font-semibold text-ink ${pressable}`}>
            Try again
          </button>
        </div>
      </Collapse>

      <div className="relative">
        <button
          type="button"
          aria-label="Share"
          onClick={() => share(findings.length)}
          className="absolute -top-1.5 -right-1.5 flex size-10 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:text-ink"
        >
          <ShareIcon size={19} />
        </button>
        <p className="mb-1.5 text-center text-[13px] text-ink-soft">
          {newest ? `From ${bankNames.format(banks.map((bank) => bank.name))}` : "Found in 2 years of transactions"}
        </p>
        <h1
          tabIndex={-1}
          className="text-center text-[48px]/none font-normal tracking-[-0.045em] text-ink outline-none sm:text-[56px]/none"
        >
          <AnimatedNumber value={findings.length} from={0} speed="slow" /> {findings.length === 1 ? "thing" : "things"}
        </h1>
        <p className={`mt-1.5 text-center text-[15px] text-ink-soft ${newest && added.length > 0 ? "mb-4" : "mb-9"}`}>
          you own or pay for
        </p>
        {newest && added.length > 0 && (
          <p className="mb-9 flex justify-center">
            <motion.span
              {...reveal.pop(counted)}
              className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-positive/8 px-3 text-[13px] font-semibold text-positive"
            >
              <PlusIcon size={13} strokeWidth={2.4} />
              {added.length} from {newest.name}
            </motion.span>
          </p>
        )}
      </div>

      {!few && flags.length > 0 && (
        <>
          <motion.h2 {...reveal.rise(after(0))} className="mb-2 text-xs/[normal] font-semibold tracking-[0.04em] text-warn">
            WORTH A LOOK
          </motion.h2>
          <ul className="mb-[34px] flex flex-col gap-2.5 sm:grid sm:grid-cols-2">
            {flags.map((flag, index) => (
              <motion.li key={flag.id} {...reveal.rise(after(index + 1))}>
                <FlagTile flag={flag} activeItems={flag.items.filter((item) => !isCancelled(item.id))} />
              </motion.li>
            ))}
          </ul>
        </>
      )}

      <CategoryList rows={rows} columns={!few} enterDelay={categoriesFrom} marksDelay={counted} />

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
        <Button href="/secure" name="found-add-all" variant="inkDeep" size="block">
          Add all to my record
        </Button>
      </motion.div>

      {!few && (
        <motion.p
          {...reveal.rise(restFrom + stagger.base)}
          className="mt-[18px] flex flex-wrap items-center justify-center gap-x-1.5 text-center text-[13px] text-ink-soft sm:text-sm/[normal]">
          Bills paid from another account?
          <Link href={ADD_BANK_HREF} name="found-add-bank" className="font-semibold text-ink">
            Add that bank
          </Link>
        </motion.p>
      )}
    </OnboardingCard>
  );
}
