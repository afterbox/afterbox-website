import type { Metadata } from "next";
import ItemScreen from "@/components/dashboard/ItemScreen";

export const metadata: Metadata = {
  title: "Record",
};


export default function Page() {
  return <ItemScreen />;
}
