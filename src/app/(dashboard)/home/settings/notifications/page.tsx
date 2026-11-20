import type { Metadata } from "next";
import { NotificationsScreen } from "@/components/dashboard/SettingsScreens";

export const metadata: Metadata = {
  title: "Notifications",
};

export default function Page() {
  return <NotificationsScreen />;
}
