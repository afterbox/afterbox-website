import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Overlays from "@/components/dashboard/Overlays";
import DashboardShell from "@/components/ui/dashboard/DashboardShell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell overlays={<Overlays />}>{children}</DashboardShell>;
}
