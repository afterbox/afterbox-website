import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CategoryScreen from "@/components/dashboard/CategoryScreen";
import { getCategories, getCategory } from "@/lib/dashboard/mock";

export const metadata: Metadata = {
  title: "Record",
};

export function generateStaticParams() {
  return getCategories().map((category) => ({ category: category.id }));
}

export default async function CategoryPage({ params }: PageProps<"/home/record/[category]">) {
  const category = getCategory((await params).category);
  if (!category) notFound();
  return <CategoryScreen id={category.id} />;
}
