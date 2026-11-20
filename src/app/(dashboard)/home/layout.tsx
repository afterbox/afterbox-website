import type { ReactNode } from "react";
import Overlays from "@/components/dashboard/Overlays";
import DashboardShell from "@/components/ui/dashboard/DashboardShell";

/** The one entry point for the dashboard: every /home page renders inside this shell. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell overlays={<Overlays />}>{children}</DashboardShell>;
}
