import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import CategoryScreen from "@/components/onboarding/CategoryScreen";
import AfterHydration from "@/components/ui/onboarding/AfterHydration";

export const metadata: Metadata = {
  title: "What we found",
};

/** Any lower-case category id the API knows (bills, other, …); the screen handles one with no finds. */
async function Category({ params }: Pick<PageProps<"/found/[category]">, "params">) {
  const { category } = await params;
  if (!/^[a-z-]{2,40}$/.test(category)) notFound();
  return (
    <AfterHydration>
      <CategoryScreen categoryId={category} />
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
