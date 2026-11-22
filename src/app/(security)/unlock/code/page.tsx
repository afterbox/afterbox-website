import type { Metadata } from "next";
import { CodeScreen } from "@/components/security/UnlockScreens";

export const metadata: Metadata = {
  title: "Enter your backup code",
};

export default function Page() {
  return <CodeScreen />;
}
