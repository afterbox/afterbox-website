import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BankScreen } from "@/components/dashboard/SettingsScreens";

export const metadata: Metadata = {
  title: "Bank",
};

/** Bank ids are the API's UUIDs; anything else is not found. */
export default async function BankPage({ params }: PageProps<"/home/settings/banks/[bankId]">) {
  if (!/^[0-9a-f-]{36}$/i.test((await params).bankId)) notFound();
  return <BankScreen />;
}
