import type { Metadata } from "next";
import ThinScreen from "@/components/onboarding/ThinScreen";
import AfterHydration from "@/components/ui/onboarding/AfterHydration";

export const metadata: Metadata = {
  title: "Not much to read here",
};

export default function ThinPage() {
  return (
    <AfterHydration>
      <ThinScreen />
    </AfterHydration>
  );
}
