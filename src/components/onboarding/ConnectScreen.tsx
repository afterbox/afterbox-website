import Link from "next/link";
import Button from "@/components/ui/Button";
import { BanIcon, CheckIcon, ShieldCheckIcon } from "@/components/ui/icons";
import IconBadge, { BADGE_ICON } from "@/components/ui/onboarding/IconBadge";
import { Rise } from "@/components/ui/onboarding/Motion";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import ScreenTitle from "@/components/ui/onboarding/ScreenTitle";
import TinkNote from "@/components/ui/onboarding/TinkNote";
import { stagger } from "@/lib/motion";

const canSee = ["Your UK accounts and balances", "2 years of transactions"];
const cannot = ["Move your money", "See your bank login", "Share anything without you"];

const eyebrow = "mb-1.5 text-xs/[normal] font-semibold tracking-[0.04em] text-ink-soft";
const item = "flex items-center gap-2.5 py-[11px] text-sm/[normal] text-ink sm:text-[15px]";

/** Each row a step after the one before, across both lists. */
const rowDelay = (index: number) => (index + 1) * stagger.base;

/** 02: what afterbox can and can't do, before the bank. */
export default function ConnectScreen() {
  return (
    <OnboardingCard>
      <IconBadge>
        <ShieldCheckIcon size={BADGE_ICON} />
      </IconBadge>
      <ScreenTitle className="mb-[34px]">Before you connect</ScreenTitle>

      <h2 className={eyebrow}>AFTERBOX CAN SEE</h2>
      <ul className="mb-[30px]">
        {canSee.map((text, index) => (
          <Rise as="li" key={text} delay={rowDelay(index)} className={item}>
            <CheckIcon size={17} className="text-positive" />
            {text}
          </Rise>
        ))}
      </ul>
      <h2 className={eyebrow}>AFTERBOX CAN&apos;T</h2>
      <ul className="mb-[30px]">
        {cannot.map((text, index) => (
          <Rise as="li" key={text} delay={rowDelay(canSee.length + index)} className={item}>
            <BanIcon size={17} className="text-alert" />
            {text}
          </Rise>
        ))}
      </ul>

      <Button href="/connect/bank" variant="inkDeep" size="block">
        Choose your bank
      </Button>
      <TinkNote className="mt-4" />
      <p className="mt-2.5 text-center text-[13px] text-ink-soft">
        UK banks only, for now ·{" "}
        <Link href="/add" className="font-semibold underline underline-offset-3 transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:text-ink">
          Not in the UK?
        </Link>
      </p>
    </OnboardingCard>
  );
}
