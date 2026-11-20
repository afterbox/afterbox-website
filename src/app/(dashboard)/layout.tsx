import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return children;
}
