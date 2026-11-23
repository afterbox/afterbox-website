import type { Metadata } from "next";
import { Suspense } from "react";
import { CodeScreen } from "@/components/security/UnlockScreens";

export const metadata: Metadata = {
  title: "Enter your backup code",
};

export default function Page() {
  return (
    <Suspense>
      <CodeScreen />
    </Suspense>
  );
}
