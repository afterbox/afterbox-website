import type { Metadata } from "next";
import { Suspense } from "react";
import CancelGuideScreen from "@/components/onboarding/CancelGuideScreen";
import AfterHydration from "@/components/ui/onboarding/AfterHydration";

export const metadata: Metadata = {
  title: "How to cancel",
};

/** `/found/look/<flag id>/cancel/<find id>`: the guide comes from the find's `guide` key. */
async function CancelGuide({ params }: Pick<PageProps<"/found/look/[flag]/cancel/[merchant]">, "params">) {
  const { flag, merchant } = await params;
  return (
    <AfterHydration>
      <CancelGuideScreen flagId={flag} findingId={merchant} />
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
