"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import FormMessage from "@/components/ui/FormMessage";
import { GlobeIcon } from "@/components/ui/icons";
import IconBadge, { BADGE_ICON } from "@/components/ui/onboarding/IconBadge";
import { useReveal } from "@/components/ui/onboarding/Motion";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import ScreenTitle, { ScreenLead } from "@/components/ui/onboarding/ScreenTitle";
import Select from "@/components/ui/Select";
import { Sk } from "@/components/ui/dashboard/Skeleton";
import { errorCopy } from "@/lib/api/errors";
import { stagger } from "@/lib/motion";
import { useCountries } from "@/store/meta";
import { useSetCountry } from "@/store/onboarding";

const DEFAULT_COUNTRY = "NG";

/**
 * 12: not in the UK. The list is the backend's (GET /v1/meta/countries), so it matches what
 * POST /v1/onboarding/country accepts; choosing one sets the member's home currency.
 * The country is picked with the design system's select (ui/Select).
 */
export default function AddScreen() {
  const router = useRouter();
  const countries = useCountries();
  const setCountry = useSetCountry();
  const reveal = useReveal();
  const abroad = (countries.data ?? []).filter((country) => country.code !== "GB");
  const [chosen, setChosen] = useState<string | null>(null);
  const code = chosen ?? (abroad.some((country) => country.code === DEFAULT_COUNTRY) ? DEFAULT_COUNTRY : abroad[0]?.code);
  const name = abroad.find((country) => country.code === code)?.name;

  return (
    <OnboardingCard>
      <IconBadge>
        <GlobeIcon size={BADGE_ICON} />
      </IconBadge>
      <ScreenTitle className="mb-2">Add things yourself for now</ScreenTitle>
      <ScreenLead className="mb-[34px]">We’ll let you know when banks {name ? `in ${name}` : "where you are"} work with afterbox.</ScreenLead>

      {countries.isPending ? (
        <Sk className="mb-6 h-12 w-full rounded-field sm:h-[52px]" />
      ) : (
        <motion.div {...reveal.rise(stagger.base)} className="mb-6">
          <Select
            look="inline"
            label="Where you bank"
            value={code ?? ""}
            onChange={setChosen}
            options={abroad.map((country) => ({ value: country.code, label: country.name }))}
          />
        </motion.div>
      )}

      <motion.div {...reveal.rise(2 * stagger.base)}>
        <Button
          variant="inkDeep"
          size="block"
          disabled={!code}
          loading={setCountry.isPending}
          loadingLabel="Saving"
          onClick={() => code && setCountry.mutate(code, { onSuccess: () => router.push("/add/first") })}
        >
          Continue
        </Button>
        <FormMessage message={setCountry.isError ? errorCopy(setCountry.error) : null} gapClassName="pt-3" />
      </motion.div>
    </OnboardingCard>
  );
}
