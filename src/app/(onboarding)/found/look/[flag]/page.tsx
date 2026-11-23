import type { Metadata } from "next";
import { Suspense } from "react";
import LookScreen from "@/components/onboarding/LookScreen";
import AfterHydration from "@/components/ui/onboarding/AfterHydration";

export const metadata: Metadata = {
  title: "Worth a look",
};

/** Flag ids are UUIDs from the API; an unknown one sends the screen back to /found. */
async function Look({ params }: Pick<PageProps<"/found/look/[flag]">, "params">) {
  const { flag } = await params;
  return (
    <AfterHydration>
      <LookScreen flagId={flag} />
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
