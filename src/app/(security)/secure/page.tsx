import type { Metadata } from "next";
import SecureScreen from "@/components/security/SecureScreen";

export const metadata: Metadata = {
  title: "Lock your record",
};

export default function Page() {
  return <SecureScreen />;
}
