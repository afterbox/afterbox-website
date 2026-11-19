"use client";

import type { ReactNode } from "react";
import { usePlaceCard } from "@/components/ui/onboarding/OnboardingShell";

const sizes = {
  /** Most screens: 580px card. */
  default: "pt-[60px] sm:w-[580px] sm:pt-14 sm:pb-12",
  /** Inside a category: 600px card. */
  category: "pt-[60px] sm:w-[600px] sm:pt-14 sm:pb-12",
  /** Found with two columns: 720px card, tighter top. */
  results: "pt-7 sm:w-[720px] sm:pt-10 sm:pb-9",
} as const;

/**
 * A screen's content inside the shell's card (from 640px; on phones it sits straight on the page).
 * The card itself persists between screens and animates to this content's size.
 */
export default function OnboardingCard({ size = "default", children }: { size?: keyof typeof sizes; children: ReactNode }) {
  usePlaceCard();
  return <div className={`px-6 pb-12 sm:max-w-full sm:px-14 ${sizes[size]}`}>{children}</div>;
}
