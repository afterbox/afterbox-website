import type { Metadata } from "next";
import StartScreen from "@/components/onboarding/StartScreen";
import AfterHydration from "@/components/ui/onboarding/AfterHydration";

export const metadata: Metadata = {
  title: "Find everything you own",
  robots: { index: false },
};

export default function StartPage() {
  return (
    <AfterHydration>
      <StartScreen />
    </AfterHydration>
  );
}
