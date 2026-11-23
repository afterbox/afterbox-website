import type { Metadata } from "next";
import { Suspense } from "react";
import HelpCancelScreen from "@/components/invite/HelpCancelScreen";

export const metadata: Metadata = {
  title: "Stop this request",
  robots: { index: false, follow: false },
};

export default function HelpCancelPage() {
  return (
    <Suspense>
      <HelpCancelScreen />
    </Suspense>
  );
}
