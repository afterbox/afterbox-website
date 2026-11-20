import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import CancelGuideScreen from "@/components/onboarding/CancelGuideScreen";
import AfterHydration from "@/components/ui/onboarding/AfterHydration";
import { getCancelGuideRoutes } from "@/lib/onboarding/mock";

export const metadata: Metadata = {
  title: "How to cancel",
};

export function generateStaticParams() {
  return getCancelGuideRoutes();
}

async function CancelGuide({ params }: Pick<PageProps<"/found/look/[flag]/cancel/[merchant]">, "params">) {
  const { flag, merchant } = await params;
  const route = getCancelGuideRoutes().find((known) => known.flag === flag && known.merchant === merchant);
  if (!route) notFound();
  return (
    <AfterHydration>
      <CancelGuideScreen flagId={route.flag} merchant={route.merchant} />
    </AfterHydration>
  );
}

export default function CancelGuidePage({ params }: PageProps<"/found/look/[flag]/cancel/[merchant]">) {
  return (
    <Suspense>
      <CancelGuide params={params} />
    </Suspense>
  );
}
