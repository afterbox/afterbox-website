import type { Metadata } from "next";
import type { ReactNode } from "react";
import OnboardingShell from "@/components/ui/onboarding/OnboardingShell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <OnboardingShell>{children}</OnboardingShell>;
}
