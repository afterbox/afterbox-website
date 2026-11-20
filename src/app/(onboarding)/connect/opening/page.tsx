import type { Metadata } from "next";
import OpeningScreen from "@/components/onboarding/OpeningScreen";
import AfterHydration from "@/components/ui/onboarding/AfterHydration";

export const metadata: Metadata = {
  title: "Opening your bank",
};

export default function OpeningPage() {
  return (
    <AfterHydration>
      <OpeningScreen />
    </AfterHydration>
  );
}
