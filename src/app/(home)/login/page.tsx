import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "@/components/login/LoginForm";
import EmailAuthForm from "@/components/ui/auth/EmailAuthForm";

export const metadata: Metadata = {
  title: "Welcome back",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<EmailAuthForm mode="login" />}>
      <LoginForm />
    </Suspense>
  );
}
