import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BankScreen } from "@/components/dashboard/SettingsScreens";
import { getBank, getBanks } from "@/lib/onboarding/mock";

export const metadata: Metadata = {
  title: "Bank",
};

export function generateStaticParams() {
  return getBanks().map((bank) => ({ bankId: bank.id }));
}

export default async function BankPage({ params }: PageProps<"/settings/banks/[bankId]">) {
  if (!getBank((await params).bankId)) notFound();
  return <BankScreen />;
}
