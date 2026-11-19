"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CheckIcon } from "@/components/ui/icons";
import BankPicker from "@/components/ui/onboarding/BankPicker";
import Monogram from "@/components/ui/onboarding/Monogram";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import ScreenTitle from "@/components/ui/onboarding/ScreenTitle";
import { getBank, getBanks, type Bank } from "@/lib/onboarding/mock";
import { useOnboarding } from "@/lib/onboarding/store";

/** How many banks are listed before a search; the rest (Starling) only come up when searched for. */
const FEATURED_BANKS = 7;

/** 03 and 04, or 15 with `?another=1`: connected banks pinned on top and left out of the list. */
export default function BankScreen() {
  const another = useSearchParams().get("another") === "1";
  const router = useRouter();
  const { state, actions } = useOnboarding();
  const connected = another ? state.banks.flatMap((bank) => getBank(bank.id) ?? []) : [];
  const choices = getBanks().filter((bank) => !connected.includes(bank));
  const featured = getBanks()
    .slice(0, FEATURED_BANKS)
    .filter((bank) => !connected.includes(bank));

  function choose(bank: Bank) {
    actions.chooseBank(bank.id, another);
    router.push("/connect/opening");
  }

  return (
    <OnboardingCard>
      <ScreenTitle className="mb-[30px]">{another ? "Add another bank" : "Choose your UK bank"}</ScreenTitle>
      {connected.length > 0 && (
        <ul className="mb-7 flex flex-col gap-2">
          {connected.map((bank) => (
            <li
              key={bank.id}
              className="flex items-center gap-3.5 rounded-panel border border-line bg-ground px-4 py-3.5 text-[15px] text-ink"
            >
              <Monogram letters={bank.monogram} />
              <span className="flex-1">{bank.name}</span>
              <span className="inline-flex items-center gap-[5px] text-[13px] font-semibold text-positive">
                <CheckIcon size={15} strokeWidth={2.4} />
                Connected
              </span>
            </li>
          ))}
        </ul>
      )}
      <BankPicker banks={choices} featured={featured} onChoose={choose} />
    </OnboardingCard>
  );
}
