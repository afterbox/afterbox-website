import type { ReactNode } from "react";
import OnboardingShell from "@/components/ui/onboarding/OnboardingShell";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <OnboardingShell>{children}</OnboardingShell>;
}
