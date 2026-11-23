"use client";

import { useSearchParams } from "next/navigation";
import EmailAuthForm from "@/components/ui/auth/EmailAuthForm";

export default function LoginForm() {
  const params = useSearchParams();
  return <EmailAuthForm mode="login" initialEmail={params.get("email")} googleFailed={params.get("error") === "google"} />;
}
