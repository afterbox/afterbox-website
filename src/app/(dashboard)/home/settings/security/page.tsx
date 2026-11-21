import type { Metadata } from "next";
import { SecuritySettingsScreen } from "@/components/dashboard/SecuritySettings";

export const metadata: Metadata = {
  title: "Devices and access",
};

export default function Page() {
  return <SecuritySettingsScreen />;
}
