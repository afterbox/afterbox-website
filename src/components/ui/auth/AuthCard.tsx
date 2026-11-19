"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type AuthCardProps = {
  /**
   * Shared with the onboarding card, so the card carries straight on into it. Changing it remounts
   * the card: Motion only picks up a layoutId when the card mounts.
   */
  layoutId?: string;
  children: ReactNode;
};

/** Card on 640px and up; on phones the content sits straight on the page. */
export default function AuthCard({ layoutId, children }: AuthCardProps) {
  return (
    <div className="w-full sm:w-[440px] sm:-translate-y-[2%]">
      <motion.section
        key={layoutId}
        layoutId={layoutId}
        className="w-full px-6 pt-[52px] pb-8 sm:rounded-card sm:bg-card sm:px-10 sm:pt-11 sm:pb-9 sm:shadow-card"
      >
        {children}
      </motion.section>
    </div>
  );
}
