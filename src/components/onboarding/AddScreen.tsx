"use client";

import { motion } from "motion/react";
import Button from "@/components/ui/Button";
import { ChevronDownIcon, GlobeIcon } from "@/components/ui/icons";
import IconBadge, { BADGE_ICON } from "@/components/ui/onboarding/IconBadge";
import { useReveal } from "@/components/ui/onboarding/Motion";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import ScreenTitle, { ScreenLead } from "@/components/ui/onboarding/ScreenTitle";
import { stagger } from "@/lib/motion";
import { getCountries } from "@/lib/onboarding/mock";
import { useOnboarding } from "@/lib/onboarding/store";

/** 12: not in the UK. A native select sits invisibly over the field, so it keeps the platform picker. */
export default function AddScreen() {
  const { state, actions } = useOnboarding();
  const reveal = useReveal();

  return (
    <OnboardingCard>
      <IconBadge>
        <GlobeIcon size={BADGE_ICON} />
      </IconBadge>
      <ScreenTitle className="mb-2">Add things yourself for now</ScreenTitle>
      <ScreenLead className="mb-[34px]">We’ll let you know when banks in {state.country} work with afterbox.</ScreenLead>

      <motion.label
        {...reveal.rise(stagger.base)}
        className="relative mb-6 flex h-12 items-center justify-between rounded-field border border-line bg-ground px-4 text-[15px] text-ink transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--motion-ease)] has-focus-visible:border-ink-deep has-focus-visible:ring-3 has-focus-visible:ring-ink-deep/14 sm:h-[52px]"
      >
        <span id="where-you-bank">Where you bank</span>
        <span aria-hidden="true" className="flex items-center gap-1.5">
          {state.country}
          <ChevronDownIcon size={16} className="text-ink-soft/70" />
        </span>
        <select
          aria-labelledby="where-you-bank"
          value={state.country}
          onChange={(event) => actions.setCountry(event.target.value)}
          className="absolute inset-0 cursor-pointer appearance-none opacity-0"
        >
          {getCountries().map((country) => (
            <option key={country}>{country}</option>
          ))}
        </select>
      </motion.label>

      <motion.div {...reveal.rise(2 * stagger.base)}>
        <Button href="/add/first" name="add-continue" variant="inkDeep" size="block">
          Continue
        </Button>
      </motion.div>
    </OnboardingCard>
  );
}
