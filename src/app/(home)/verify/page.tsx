import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyForm, { VerifyScreen } from "@/components/verify/VerifyForm";
import { DEMO_EMAIL } from "@/lib/mock-auth";

export const metadata: Metadata = {
  title: "Check your email",
  robots: { index: false },
};

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyScreen email={DEMO_EMAIL} from="signup" demo={null} />}>
      <VerifyForm />
    </Suspense>
  );
}
