import type { Metadata } from "next";
import { AccountScreen } from "@/components/dashboard/SettingsScreens";

export const metadata: Metadata = {
  title: "Account",
};

export default function Page() {
  return <AccountScreen />;
}
