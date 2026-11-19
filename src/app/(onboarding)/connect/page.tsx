import type { Metadata } from "next";
import ConnectScreen from "@/components/onboarding/ConnectScreen";
import AfterHydration from "@/components/ui/onboarding/AfterHydration";

export const metadata: Metadata = {
  title: "Before you connect",
  robots: { index: false },
};

export default function ConnectPage() {
  return (
    <AfterHydration>
      <ConnectScreen />
    </AfterHydration>
  );
}
