"use client";

import { formatMoney } from "@/lib/onboarding/format";
import { AnimatedNumber } from "./Motion";

/** The yearly saving panel on the Worth a look screens. Announces changes as choices change. */
export default function SavingBox({ label, perYear, note }: { label: string; perYear: number; note: string }) {
  return (
    <div aria-live="polite" className="mb-8 rounded-panel border border-line bg-ground p-5 text-center">
      <p className="text-[13px] text-ink-soft">{label}</p>
      <p className="mt-1.5 text-[32px]/none tracking-[-0.035em] text-ink tabular-nums sm:text-[36px]/none">
        <AnimatedNumber value={perYear} format={formatMoney} />
        <span className="text-[15px] tracking-normal text-ink-soft"> a year</span>
      </p>
      <p className="mt-2 text-[13px] text-ink-soft">{note}</p>
    </div>
  );
}
