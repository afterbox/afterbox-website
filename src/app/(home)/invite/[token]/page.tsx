import type { Metadata } from "next";
import { Suspense } from "react";
import InviteScreen from "@/components/invite/InviteScreen";

export const metadata: Metadata = {
  title: "You’ve been chosen",
  robots: { index: false, follow: false },
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <Suspense>
      <InviteScreen token={token} />
    </Suspense>
  );
}
