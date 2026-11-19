import type { ReactNode } from "react";

const tones = {
  brand: "bg-mist text-ink-deep",
  warn: "bg-warn/8 text-warn",
  alert: "bg-alert/8 text-alert",
} as const;

/** The 56px circle above a title. Pass a 25.76px icon. */
export default function IconBadge({ tone = "brand", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={`mx-auto mb-7 flex size-14 items-center justify-center rounded-full ${tones[tone]}`}>{children}</span>
  );
}

/** Icon size that fills an IconBadge like the design. */
export const BADGE_ICON = 25.76;
