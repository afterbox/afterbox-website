import type { Metadata } from "next";
import { Suspense } from "react";
import { AskScreen } from "@/components/security/UnlockScreens";

export const metadata: Metadata = {
  title: "Ask for help",
};

export default function Page() {
  return (
    <Suspense>
      <AskScreen />
    </Suspense>
  );
}
