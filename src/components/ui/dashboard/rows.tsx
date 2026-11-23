"use client";

import type { ReactNode } from "react";
import { ChevronRightIcon } from "@/components/ui/icons";
import { Link } from "@/components/ui/Links";
import Monogram from "@/components/ui/onboarding/Monogram";
import { pressable } from "@/lib/motion";
import { Pill, type PillTone } from "./bits";

const rowClasses = `group flex w-full cursor-pointer items-center gap-3.5 border-b border-line py-4 text-left ${pressable}`;

/** A thing in the record: monogram, title, one line under it, status pill and a chevron. */
export function ItemRow({
  href,
  name,
  onClick,
  monogram,
  group = null,
  size = "sm",
  title,
  sub,
  status,
}: {
  href?: string;
  name?: string;
  onClick?: () => void;
  monogram: string;
  /** The item's worth-a-look group: its glyph on the monogram. */
  group?: string | null;
  size?: "sm" | "row";
  title: string;
  sub: string | null;
  status: PillTone;
}) {
  const body = (
    <>
      <Monogram letters={monogram} group={group} size={size} />
      <span className="block min-w-0 flex-1">
        <span className="block truncate text-[15px] text-ink group-hover:text-ink-deep">{title}</span>
        {sub && <span className="mt-0.5 block text-[13px] text-ink-soft">{sub}</span>}
      </span>
      <Pill tone={status} />
      <ChevronRightIcon size={16} className="flex-none text-ink-soft/70 transition-transform duration-[var(--motion-fast)] group-hover:translate-x-0.5" />
    </>
  );
  if (href) {
    return (
      <Link href={href} name={name ?? "item-row"} className={rowClasses}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={rowClasses}>
      {body}
    </button>
  );
}

/** "Paid · £38.20 a month": a label on the left, the value (or an action) on the right. */
export function DetailRow({ label, children, last = false }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <div className={`flex min-h-[52px] items-center gap-3.5 py-3.5 ${last ? "" : "border-b border-line"}`}>
      <p className="min-w-0 flex-1 text-[15px] text-ink">{label}</p>
      <div className="min-w-0 text-right text-[15px] text-ink">{children}</div>
    </div>
  );
}
