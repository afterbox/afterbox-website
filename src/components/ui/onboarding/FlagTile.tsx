import { ChevronRightIcon, FlagIcon } from "@/components/ui/icons";
import { Link } from "@/components/ui/Links";
import type { Flag } from "@/lib/api/types";
import { pressable } from "@/lib/motion";
import { formatMoney } from "@/lib/money";

/** "£38.20 a month each" when the amounts match, the combined amount otherwise. A flag is always one currency. */
export function flagAmount(flag: Flag) {
  const amounts = flag.finds.flatMap((find) => (find.monthly ? [find.monthly] : []));
  if (amounts.length === 0) return `${formatMoney(flag.saving.monthly)} a month to save`;
  const same = amounts.every((amount) => amount.minor === amounts[0].minor);
  if (same && amounts.length > 1) return `${formatMoney(amounts[0])} a month each`;
  const total = amounts.reduce((sum, amount) => sum + amount.minor, 0);
  return `${formatMoney({ minor: total, currency: amounts[0].currency })} a month`;
}

export default function FlagTile({ flag }: { flag: Flag }) {
  return (
    <Link
      href={`/found/look/${flag.id}`}
      name={`flag-${flag.id}`}
      className={`group flex items-center gap-3 rounded-panel border border-warn/18 bg-warn/6 px-3.5 py-3 ${pressable}`}
    >
      <FlagIcon size={17} className="text-warn" />
      <span className="flex-1">
        <span className="block text-sm/[normal] font-semibold text-ink">{flag.title}</span>
        <span className="mt-px block text-[13px] text-ink-soft">{flagAmount(flag)}</span>
      </span>
      <ChevronRightIcon size={16} className="text-ink-soft/70 transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] group-hover:text-ink" />
    </Link>
  );
}
