import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import CategoryScreen from "@/components/onboarding/CategoryScreen";
import AfterHydration from "@/components/ui/onboarding/AfterHydration";
import { getCategories, getCategory } from "@/lib/onboarding/mock";

export const metadata: Metadata = {
  title: "What we found",
  robots: { index: false },
};

export function generateStaticParams() {
  return getCategories().map((category) => ({ category: category.id }));
}

async function Category({ params }: Pick<PageProps<"/found/[category]">, "params">) {
  const category = getCategory((await params).category);
  if (!category) notFound();
  return (
    <AfterHydration>
      <CategoryScreen categoryId={category.id} />
    </AfterHydration>
  );
}

export default function CategoryPage({ params }: PageProps<"/found/[category]">) {
  return (
    <Suspense>
      <Category params={params} />
    </Suspense>
  );
}
