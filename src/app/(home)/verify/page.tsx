import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyForm, { VerifyScreen } from "@/components/verify/VerifyForm";

export const metadata: Metadata = {
  title: "Check your email",
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyScreen email="" from="signup" />}>
      <VerifyForm />
    </Suspense>
  );
}
