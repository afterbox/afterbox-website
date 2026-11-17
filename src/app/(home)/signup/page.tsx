import type { Metadata } from "next";
import { Suspense } from "react";
import SignupForm from "@/components/signup/SignupForm";
import EmailAuthForm from "@/components/ui/auth/EmailAuthForm";

export const metadata: Metadata = {
  title: "Start your record",
  robots: { index: false },
};

export default function SignupPage() {
  return (
    <Suspense fallback={<EmailAuthForm mode="signup" />}>
      <SignupForm />
    </Suspense>
  );
}
