import type { Metadata } from "next";
import BankScreen from "@/components/onboarding/BankScreen";
import AfterHydration from "@/components/ui/onboarding/AfterHydration";

export const metadata: Metadata = {
  title: "Choose your bank",
  robots: { index: false },
};

export default function BankPage() {
  return (
    <AfterHydration>
      <BankScreen />
    </AfterHydration>
  );
}
