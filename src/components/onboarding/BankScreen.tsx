"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import Button from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import BankPicker from "@/components/ui/onboarding/BankPicker";
import Monogram from "@/components/ui/onboarding/Monogram";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import ScreenTitle, { ScreenLead } from "@/components/ui/onboarding/ScreenTitle";
import { BankListSkeleton } from "@/components/ui/onboarding/Skeletons";
import TinkNote from "@/components/ui/onboarding/TinkNote";
import type { Provider } from "@/lib/api/types";
import { useProviders } from "@/store/banks";
import { useFound } from "@/store/onboarding";

/** How many banks are listed before a search. The rest come up when searched for. */
const FEATURED_BANKS = 7;
const WELL_KNOWN = ["Barclays", "HSBC", "Lloyds", "Monzo", "Nationwide", "NatWest", "Santander", "Starling"];

export function openingHref(bank: Provider | null, another: boolean) {
  const params = new URLSearchParams();
  if (bank) {
    params.set("provider", bank.id);
    params.set("name", bank.name);
  }
  if (another) params.set("another", "1");
  return `/connect/opening?${params}`;
}

/** 03 and 04, or 15 with `?another=1`: banks already read pinned on top and left out of the list. */
export default function BankScreen() {
  const another = useSearchParams().get("another") === "1";
  const router = useRouter();
  const providers = useProviders();
  const found = useFound({ enabled: another });
  const connected = useMemo(() => (another ? (found.data?.sources ?? []) : []), [another, found.data]);

  const { choices, featured } = useMemo(() => {
    const list = (providers.data ?? []).filter((bank) => !connected.includes(bank.name));
    const known = WELL_KNOWN.flatMap((name) => list.find((bank) => bank.name.toLowerCase().startsWith(name.toLowerCase())) ?? []);
    return { choices: list, featured: (known.length >= 4 ? known : list).slice(0, FEATURED_BANKS) };
  }, [providers.data, connected]);

  useEffect(() => {
    router.prefetch("/connect/opening");
  }, [router]);

  const title = another ? "Add another bank" : "Choose your UK bank";

  // Tink's list couldn't be fetched: pick the bank in Tink Link instead.
  if (providers.isSuccess && providers.data.length === 0) {
    return (
      <OnboardingCard>
        <ScreenTitle className="mb-2">{title}</ScreenTitle>
        <ScreenLead className="mb-[34px]">Pick your bank in the next step.</ScreenLead>
        <Button href={openingHref(null, another)} name="bank-continue" variant="inkDeep" size="block">
          Continue
        </Button>
        <TinkNote className="mt-4" />
      </OnboardingCard>
    );
  }

  return (
    <OnboardingCard>
      <ScreenTitle className="mb-[30px]">{title}</ScreenTitle>
      {connected.length > 0 && (
        <ul className="mb-7 flex flex-col gap-2">
          {connected.map((name) => (
            <li key={name} className="flex items-center gap-3.5 rounded-panel border border-line bg-ground px-4 py-3.5 text-[15px] text-ink">
              <Monogram letters={name.charAt(0).toUpperCase()} />
              <span className="flex-1">{name}</span>
              <span className="inline-flex items-center gap-[5px] text-[13px] font-semibold text-positive">
                <CheckIcon size={15} strokeWidth={2.4} />
                Connected
              </span>
            </li>
          ))}
        </ul>
      )}
      {providers.isPending ? (
        <BankListSkeleton />
      ) : providers.isError ? (
        <>
          <ScreenLead className="mb-6">We couldn’t load the list of banks. You can pick yours in the next step.</ScreenLead>
          <Button href={openingHref(null, another)} name="bank-continue" variant="inkDeep" size="block">
            Continue
          </Button>
        </>
      ) : (
        <BankPicker banks={choices} featured={featured} onChoose={(bank) => router.push(openingHref(bank, another))} />
      )}
    </OnboardingCard>
  );
}
