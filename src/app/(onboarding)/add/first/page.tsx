import type { Metadata } from "next";
import AddFirstScreen from "@/components/onboarding/AddFirstScreen";
import AfterHydration from "@/components/ui/onboarding/AfterHydration";

export const metadata: Metadata = {
  title: "What do you want to add first?",
};

export default function AddFirstPage() {
  return (
    <AfterHydration>
      <AddFirstScreen />
    </AfterHydration>
  );
}
