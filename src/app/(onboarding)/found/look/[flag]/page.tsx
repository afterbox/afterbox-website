import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import LookScreen from "@/components/onboarding/LookScreen";
import AfterHydration from "@/components/ui/onboarding/AfterHydration";
import { getFlagIds } from "@/lib/onboarding/mock";

export const metadata: Metadata = {
  title: "Worth a look",
  robots: { index: false },
};

export function generateStaticParams() {
  return getFlagIds().map((flag) => ({ flag }));
}

async function Look({ params }: Pick<PageProps<"/found/look/[flag]">, "params">) {
  const { flag } = await params;
  const flagId = getFlagIds().find((id) => id === flag);
  if (!flagId) notFound();
  return (
    <AfterHydration>
      <LookScreen flagId={flagId} />
    </AfterHydration>
  );
}

export default function LookPage({ params }: PageProps<"/found/look/[flag]">) {
  return (
    <Suspense>
      <Look params={params} />
    </Suspense>
  );
}
