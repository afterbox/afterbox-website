"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AlertIcon, CheckIcon, ClockIcon, WifiOffIcon } from "./icons";

/** Opens and closes its height smoothly (grid rows 0fr to 1fr) so nothing below jumps. */
export function Reveal({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      inert={!open}
      className={`auth-reveal grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

const icons = { alert: AlertIcon, check: CheckIcon, clock: ClockIcon, wifiOff: WifiOffIcon };

type Tone = "error" | "success";
type MessageIcon = keyof typeof icons;
type MessageLink = { href: string; label: string };

type FormMessageProps = {
  id?: string;
  /** Hidden when null. */
  message: string | null;
  tone?: Tone;
  /** Defaults to the alert icon for errors and a tick for success. */
  icon?: MessageIcon;
  link?: MessageLink;
  align?: "start" | "center";
  /** Space above the line. */
  gapClassName?: string;
  /** Turn off for text that ticks every second (a countdown). */
  live?: boolean;
};

/** One short status line with an icon. Keeps its last text while it closes. */
export default function FormMessage({
  id,
  message,
  tone = "error",
  icon,
  link,
  align = "center",
  gapClassName = "pt-2.5",
  live = true,
}: FormMessageProps) {
  const [shown, setShown] = useState({ message, tone, icon, link });
  if (message && (message !== shown.message || tone !== shown.tone || icon !== shown.icon)) {
    setShown({ message, tone, icon, link });
  }
  const Icon = icons[shown.icon ?? (shown.tone === "error" ? "alert" : "check")];

  return (
    <div aria-live={live ? "polite" : "off"}>
      <Reveal open={Boolean(message)}>
        <p
          id={id}
          className={`flex items-center gap-[7px] text-[13px]/[18px] ${
            shown.tone === "error" ? "text-alert" : "text-positive"
          } ${align === "center" ? "justify-center text-center" : ""} ${gapClassName}`}
        >
          <Icon size={15} />
          <span>
            {shown.message}
            {shown.link && (
              <>
                {" "}
                <Link href={shown.link.href} className="font-semibold underline underline-offset-3">
                  {shown.link.label}
                </Link>
              </>
            )}
          </span>
        </p>
      </Reveal>
    </div>
  );
}
