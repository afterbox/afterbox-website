"use client";

import { useSearchParams } from "next/navigation";
import EmailAuthForm from "@/components/ui/auth/EmailAuthForm";
import { readDemo } from "@/lib/mock-auth";

export default function LoginForm() {
  const params = useSearchParams();
  return <EmailAuthForm mode="login" initialEmail={params.get("email")} demo={readDemo(params.get("demo"))} />;
}
