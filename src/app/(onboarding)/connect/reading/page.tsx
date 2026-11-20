import type { Metadata } from "next";
import ReadingScreen from "@/components/onboarding/ReadingScreen";
import AfterHydration from "@/components/ui/onboarding/AfterHydration";

export const metadata: Metadata = {
  title: "Reading your accounts",
};

export default function ReadingPage() {
  return (
    <AfterHydration>
      <ReadingScreen />
    </AfterHydration>
  );
}
