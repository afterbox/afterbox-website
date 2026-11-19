import type { Metadata } from "next";
import FoundScreen from "@/components/onboarding/FoundScreen";
import AfterHydration from "@/components/ui/onboarding/AfterHydration";

export const metadata: Metadata = {
  title: "What we found",
  robots: { index: false },
};

export default function FoundPage() {
  return (
    <AfterHydration>
      <FoundScreen />
    </AfterHydration>
  );
}
