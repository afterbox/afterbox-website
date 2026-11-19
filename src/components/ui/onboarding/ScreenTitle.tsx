import type { ReactNode } from "react";

const sizes = {
  default: "text-[27px]/[1.1] tracking-[-0.035em] sm:text-[32px]/[1.1]",
  hook: "text-[27px]/[1.1] tracking-[-0.035em] sm:text-[34px]/[1.1]",
} as const;

type ScreenTitleProps = {
  size?: keyof typeof sizes;
  /** Margin under the title, e.g. "mb-8". */
  className?: string;
  children: ReactNode;
};

/** The screen's one h1. Focusable so the shell can move focus to it on each route. */
export default function ScreenTitle({ size = "default", className = "", children }: ScreenTitleProps) {
  return (
    <h1 tabIndex={-1} className={`text-center font-normal text-ink outline-none ${sizes[size]} ${className}`}>
      {children}
    </h1>
  );
}

/** The line under a title: 14px on phones, 15px from 640px. */
export function ScreenLead({ className = "", children }: { className?: string; children: ReactNode }) {
  return <p className={`text-center text-sm/normal text-ink-soft sm:text-[15px]/normal ${className}`}>{children}</p>;
}
