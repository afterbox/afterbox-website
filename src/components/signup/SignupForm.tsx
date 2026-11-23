"use client";

import { useSearchParams } from "next/navigation";
import EmailAuthForm from "@/components/ui/auth/EmailAuthForm";
import { safePath } from "@/lib/afterSignIn";

export default function SignupForm() {
  const params = useSearchParams();
  return <EmailAuthForm mode="signup" initialEmail={params.get("email")} next={safePath(params.get("next"))} />;
}
