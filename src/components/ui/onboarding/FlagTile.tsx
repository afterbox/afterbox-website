import { Link } from "@/components/ui/Links";
import { ChevronRightIcon, FlagIcon } from "@/components/ui/icons";
import { formatMoney, sum } from "@/lib/onboarding/format";
import { pressable } from "@/lib/motion";
import type { Finding, Flag } from "@/lib/onboarding/mock";

/** "£38.20 a month each" when the amounts match, the combined amount otherwise. */
function flagAmount(items: Finding[]) {
  const amounts = items.map((item) => item.monthly);
  return amounts.every((amount) => amount === amounts[0])
    ? `${formatMoney(amounts[0])} a month each`
    : `${formatMoney(sum(amounts))} a month`;
}

export default function FlagTile({ flag, activeItems }: { flag: Flag; activeItems: Finding[] }) {
  return (
    <Link
      href={`/found/look/${flag.id}`}
      className={`group flex items-center gap-3 rounded-panel border border-warn/18 bg-warn/6 px-3.5 py-3 ${pressable}`}
    >
      <FlagIcon size={17} className="text-warn" />
      <span className="flex-1">
        <span className="block text-sm/[normal] font-semibold text-ink">{flag.title}</span>
        <span className="mt-px block text-[13px] text-ink-soft">{flagAmount(activeItems)}</span>
      </span>
      <ChevronRightIcon size={16} className="text-ink-soft/70 transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] group-hover:text-ink" />
    </Link>
  );
}
