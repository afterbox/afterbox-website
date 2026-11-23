"use client";

import { useSearchParams } from "next/navigation";
import EmailAuthForm from "@/components/ui/auth/EmailAuthForm";

export default function SignupForm() {
  const params = useSearchParams();
  return <EmailAuthForm mode="signup" initialEmail={params.get("email")} />;
}
