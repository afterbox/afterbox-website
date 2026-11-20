import type { Metadata } from "next";
import { SettingsScreen } from "@/components/dashboard/SettingsScreens";

export const metadata: Metadata = {
  title: "Settings",
};

export default function Page() {
  return <SettingsScreen />;
}
