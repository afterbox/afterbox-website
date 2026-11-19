import type { Metadata } from "next";
import CancelledScreen from "@/components/onboarding/CancelledScreen";
import AfterHydration from "@/components/ui/onboarding/AfterHydration";

export const metadata: Metadata = {
  title: "Connection cancelled",
  robots: { index: false },
};

export default function CancelledPage() {
  return (
    <AfterHydration>
      <CancelledScreen />
    </AfterHydration>
  );
}
