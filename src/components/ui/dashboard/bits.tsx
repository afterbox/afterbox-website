"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import {
  BankIcon,
  CardIcon,
  CheckIcon,
  ChevronLeftIcon,
  ClockIcon,
  DocumentIcon,
  HomeIcon,
  LockIcon,
  RepeatIcon,
  TrendIcon,
  UmbrellaIcon,
} from "@/components/ui/icons";
import { Link } from "@/components/ui/Links";
import Monogram from "@/components/ui/onboarding/Monogram";
import { pressable, transition } from "@/lib/motion";
import type { CategoryIcon } from "@/lib/dashboard/mock";
import { useMotionTokens } from "@/lib/useMotionTokens";

const categoryIcons = {
  umbrella: UmbrellaIcon,
  trend: TrendIcon,
  home: HomeIcon,
  lock: LockIcon,
  card: CardIcon,
  repeat: RepeatIcon,
  bank: BankIcon,
  document: DocumentIcon,
} as const;

export function CategoryGlyph({ icon, size }: { icon: CategoryIcon; size: number }) {
  const Icon = categoryIcons[icon];
  return <Icon size={size} />;
}

const squareSizes = {
  32: "size-8",
  36: "size-9",
  40: "size-10",
  44: "size-11",
  52: "size-[52px]",
} as const;

const squareTones = {
  mist: "bg-mist text-ink-deep",
  card: "bg-card text-ink-deep",
  ground: "bg-ground text-ink-soft/70",
  warn: "bg-warn/8 text-warn",
  warnSoft: "bg-warn/6 text-warn",
  positive: "bg-positive/8 text-positive",
  positiveSoft: "bg-positive/6 text-positive",
  glass: "bg-glass/16 text-glass",
} as const;

/** Rounded square holding an icon. */
export function Square({
  size = 36,
  tone = "mist",
  className = "",
  children,
}: {
  size?: keyof typeof squareSizes;
  tone?: keyof typeof squareTones;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center rounded-field transition-colors duration-[var(--motion-base)] ease-[var(--motion-ease)] ${squareSizes[size]} ${squareTones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const pillTones = {
  complete: "bg-positive/8 text-positive",
  missing: "bg-ground text-ink-soft",
  new: "bg-mist text-ink-deep",
  invited: "bg-warn/6 text-warn",
  accepted: "bg-positive/8 text-positive",
  soonGround: "bg-ground text-ink-soft",
  soonCard: "bg-card text-ink-soft",
  added: "bg-positive/8 text-positive",
} as const;

export type PillTone = keyof typeof pillTones;

const pillText: Partial<Record<PillTone, string>> = {
  complete: "Complete",
  missing: "Needs details",
  new: "New",
  invited: "Invited",
  accepted: "Accepted",
};

/** Status in a word (never colour alone). Changing status cross-fades. */
export function Pill({ tone, className = "", children }: { tone: PillTone; className?: string; children?: ReactNode }) {
  const icon =
    tone === "complete" || tone === "accepted" ? <CheckIcon size={12} strokeWidth={2.4} /> : tone === "invited" ? <ClockIcon size={12} /> : null;
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={tone}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={transition("fast")}
        className={`inline-flex h-[26px] flex-none items-center gap-[5px] rounded-full px-2.5 text-xs/[normal] font-semibold whitespace-nowrap ${pillTones[tone]} ${className}`}
      >
        {icon}
        {children ?? pillText[tone]}
      </motion.span>
    </AnimatePresence>
  );
}

/** "INSURANCE", "DETAILS", "CONNECTED BANKS". */
export function SectionLabel({ className = "", children }: { className?: string; children: ReactNode }) {
  return <h2 className={`text-xs/[normal] font-semibold tracking-[0.04em] text-ink-soft ${className}`}>{children}</h2>;
}

/** "‹ Home": the quiet way back above a page title (desktop; phones use the top bar). */
export function BackLink({ href, name, label, className = "" }: { href: string; name: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      name={name}
      className={`mb-6 inline-flex min-h-11 items-center gap-1 text-sm/[normal] font-semibold text-ink-soft hover:text-ink sm:-mt-3 ${pressable} ${className}`}
    >
      <ChevronLeftIcon size={15} strokeWidth={2.2} />
      {label}
    </Link>
  );
}

const titleSizes = {
  page: "text-[27px]/[1.1] tracking-[-0.035em] sm:text-[32px]/[1.1]",
  item: "text-[24px]/[1.15] tracking-[-0.03em] sm:text-[28px]/[1.15]",
} as const;

/** The page's one h1, focused on each route like onboarding. */
export function PageTitle({ size = "page", className = "", children }: { size?: keyof typeof titleSizes; className?: string; children: ReactNode }) {
  return (
    <h1 tabIndex={-1} className={`font-normal text-ink outline-none ${titleSizes[size]} ${className}`}>
      {children}
    </h1>
  );
}

/** Overlapping 24px monograms on a tile. */
export function StackedMonograms({ letters }: { letters: string[] }) {
  return (
    <span aria-hidden="true" className="flex">
      {letters.map((letter, index) => (
        <Monogram key={`${letter}-${index}`} letters={letter} size="xs" className={`ring-2 ring-card ${index > 0 ? "-ml-1.5" : ""}`} />
      ))}
    </span>
  );
}

/** A switch that springs. 44×26 with a 20px knob; the hit area is the whole row label. */
export function Toggle({ checked, onChange, label, describedBy }: { checked: boolean; onChange: (next: boolean) => void; label: string; describedBy?: string }) {
  const { reduced } = useMotionTokens();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className="relative flex h-11 w-[52px] flex-none cursor-pointer items-center justify-center"
    >
      <span
        className={`relative h-[26px] w-11 rounded-full transition-colors duration-[var(--motion-base)] ease-[var(--motion-ease)] ${
          checked ? "bg-ink-deep" : "bg-line"
        }`}
      >
        <motion.span
          initial={false}
          animate={{ x: checked ? 18 : 0 }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 32 }}
          className="absolute top-[3px] left-[3px] size-5 rounded-full bg-card shadow-knob"
        />
      </span>
    </button>
  );
}

const celebrationTones = {
  deep: { glow: "bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-haze)_55%,transparent),transparent_65%)]", circle: "bg-ink-deep" },
  positive: { glow: "bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-positive)_28%,transparent),transparent_65%)]", circle: "bg-positive" },
} as const;

/** The icon at the top of a celebration: a circle that springs in from 0.6 over a glow that fades in. */
export function Celebration({
  tone = "positive",
  className = "mb-6",
  children,
}: {
  tone?: keyof typeof celebrationTones;
  className?: string;
  children: ReactNode;
}) {
  const { grow, reduced } = useMotionTokens();
  const colours = celebrationTones[tone];
  return (
    <div aria-hidden="true" className={`relative mx-auto flex h-24 w-[120px] items-center justify-center ${className}`}>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={transition("slow", 0.1)}
        className={`absolute top-1/2 left-1/2 size-[180px] -translate-1/2 rounded-full ${colours.glow}`}
      />
      <motion.span
        initial={{ scale: grow(0.6), opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduced ? transition("base") : { type: "spring", stiffness: 420, damping: 20, opacity: transition("fast") }}
        className={`relative flex size-[72px] items-center justify-center rounded-full text-on-night shadow-float ${colours.circle}`}
      >
        {children}
      </motion.span>
    </div>
  );
}

/** The 56px round icon at the top of a form (Who should know?). */
export function RoundIcon({ tone = "mist", className = "mb-7", children }: { tone?: "mist" | "positive"; className?: string; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={`mx-auto flex size-14 items-center justify-center rounded-full ${tone === "mist" ? "bg-mist text-ink-deep" : "bg-positive/8 text-positive"} ${className}`}
    >
      {children}
    </span>
  );
}

/** The line under a title in overlays: 14px on phones, 15px from 640px. */
export function Lead({ className = "", children }: { className?: string; children: ReactNode }) {
  return <p className={`text-sm/normal text-ink-soft sm:text-[15px]/normal ${className}`}>{children}</p>;
}
