import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import SecurityShell from "@/components/ui/security/SecurityShell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function SecurityLayout({ children }: { children: ReactNode }) {
  return <SecurityShell>{children}</SecurityShell>;
}
