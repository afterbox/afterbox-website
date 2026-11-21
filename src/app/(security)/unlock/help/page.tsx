import type { Metadata } from "next";
import { HelpScreen } from "@/components/security/UnlockScreens";

export const metadata: Metadata = {
  title: "Get help from afterbox",
};

export default function Page() {
  return <HelpScreen />;
}
