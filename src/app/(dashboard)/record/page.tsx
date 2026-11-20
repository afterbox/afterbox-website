import type { Metadata } from "next";
import RecordScreen from "@/components/dashboard/RecordScreen";

export const metadata: Metadata = {
  title: "Record",
};

export default function Page() {
  return <RecordScreen />;
}
