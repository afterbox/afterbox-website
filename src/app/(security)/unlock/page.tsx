import type { Metadata } from "next";
import { Suspense } from "react";
import { UnlockScreen } from "@/components/security/UnlockScreens";

export const metadata: Metadata = {
  title: "Unlock your record",
};

export default function Page() {
  return (
    <Suspense>
      <UnlockScreen />
    </Suspense>
  );
}
