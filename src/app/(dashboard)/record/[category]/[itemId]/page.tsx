import type { Metadata } from "next";
import ItemScreen from "@/components/dashboard/ItemScreen";

export const metadata: Metadata = {
  title: "Record",
};

/** Item ids live in the browser session (typed-in items get new ones), so there's no static shell to check. */
export const instant = false;

export default function Page() {
  return <ItemScreen />;
}
