import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CategoryScreen from "@/components/dashboard/CategoryScreen";

export const metadata: Metadata = {
  title: "Record",
};

/** Any lower-case category id the API knows (bills included); an unknown one answers the page's error state. */
export default async function CategoryPage({ params }: PageProps<"/home/record/[category]">) {
  const { category } = await params;
  if (!/^[a-z-]{2,40}$/.test(category)) notFound();
  return <CategoryScreen id={category} />;
}
