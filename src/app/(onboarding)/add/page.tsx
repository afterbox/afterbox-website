import type { Metadata } from "next";
import AddScreen from "@/components/onboarding/AddScreen";
import AfterHydration from "@/components/ui/onboarding/AfterHydration";

export const metadata: Metadata = {
  title: "Add things yourself",
};

export default function AddPage() {
  return (
    <AfterHydration>
      <AddScreen />
    </AfterHydration>
  );
}
