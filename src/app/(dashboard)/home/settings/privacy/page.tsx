import type { Metadata } from "next";
import { PrivacyScreen } from "@/components/dashboard/SettingsScreens";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function Page() {
  return <PrivacyScreen />;
}
