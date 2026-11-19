import type { Metadata } from "next";
import CallbackScreen from "@/components/onboarding/CallbackScreen";
import AfterHydration from "@/components/ui/onboarding/AfterHydration";

export const metadata: Metadata = {
  title: "Connecting",
  robots: { index: false },
};

export default function CallbackPage() {
  return (
    <AfterHydration>
      <CallbackScreen />
    </AfterHydration>
  );
}
