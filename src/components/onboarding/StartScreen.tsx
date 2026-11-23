"use client";

import { motion } from "motion/react";
import Button from "@/components/ui/Button";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import { CategoryGlyph } from "@/components/ui/onboarding/IconSquare";
import { useReveal } from "@/components/ui/onboarding/Motion";
import ScreenTitle from "@/components/ui/onboarding/ScreenTitle";
import { RepeatIcon } from "@/components/ui/icons";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { hookLines } from "@/content/onboarding";
import { takeAfterSignIn } from "@/lib/afterSignIn";
import { stagger } from "@/lib/motion";
import { formatMoney } from "@/lib/money";
import { resumeFrom } from "@/lib/onboarding/resume";
import { useMe } from "@/store/me";


const reference = "truncate text-xs/[normal] font-medium tracking-[0.04em] text-ink-soft tabular-nums";
const pill = "inline-flex h-7 flex-none items-center gap-1.5 rounded-full px-2.5 text-xs/[normal] font-semibold whitespace-nowrap text-on-night";

/** 01: the hook. */
export default function StartScreen() {
  const { lines, flagged } = hookLines;
  const router = useRouter();
  const me = useMe();
  const step = me.data?.onboardingStep ?? null;
  const keysReady = me.data?.keysReady ?? false;
  const signedIn = Boolean(me.data);
  const left = useRef(false);

  // Google sign-in lands new accounts here: an invite link they came from comes first. Then a member who signed
  // in part-way through onboarding carries on from the furthest step they reached.
  useEffect(() => {
    if (left.current) return;
    const next = takeAfterSignIn() ?? (signedIn ? resumeFrom(step, keysReady) : null);
    if (!next) return;
    left.current = true;
    router.replace(next);
  }, [keysReady, router, signedIn, step]);
  const reveal = useReveal();
  // Lines come in one by one (the flagged one last), then their labels in the same order.
  const lineDelay = (index: number) => (index + 1) * stagger.hook;
  const chipDelay = (index: number) => lineDelay(lines.length + 1) + index * stagger.hook;

  return (
    <OnboardingCard>
      <ScreenTitle size="hook" className="mb-2">
        Find everything you own
      </ScreenTitle>
      <p className="mb-9 text-center text-sm/[normal] text-ink-soft sm:text-[15px]">Straight from your bank, in about a minute.</p>

      <ul aria-label="For example" className="mb-10 rounded-panel border border-line bg-ground px-4 py-1.5">
        {lines.map((line, index) => (
          <motion.li
            key={line.reference}
            {...reveal.rise(lineDelay(index))}
            className="flex items-center justify-between gap-2.5 border-b border-line py-[15px]"
          >
            <span className={reference}>{line.reference}</span>
            <motion.span {...reveal.pop(chipDelay(index))} className={`${pill} bg-ink-deep`}>
              <CategoryGlyph icon={line.icon} size={13} />
              {line.label}
            </motion.span>
          </motion.li>
        ))}
        <motion.li {...reveal.rise(lineDelay(lines.length))} className="py-[15px]">
          <div className="flex items-center justify-between gap-2.5">
            <span className={reference}>{flagged.reference}</span>
            <motion.span {...reveal.pop(chipDelay(lines.length))} className={`${pill} bg-warn`}>
              <RepeatIcon size={13} />
              {flagged.label}
            </motion.span>
          </div>
          <motion.p {...reveal.fade(chipDelay(lines.length))} className="mt-1.5 text-right text-xs/[normal] text-warn">
            {formatMoney(flagged.monthly)} a month · worth a look
          </motion.p>
        </motion.li>
      </ul>

      <Button href="/connect" name="start-find-mine" variant="inkDeep" size="block">
        Find mine
      </Button>
    </OnboardingCard>
  );
}
