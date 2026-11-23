"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { Celebration, Lead, PageTitle } from "@/components/ui/dashboard/bits";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import { deviceName, deviceWord } from "@/lib/security/deviceInfo";

/** Any unlocked device can make a backup code: Settings → Security with the backup code sheet open. */
export const NEW_BACKUP_CODE = "/home/settings/security?sheet=backup-code";

const thisDevice = () => deviceWord(deviceName().device);

/** 08: in on a new device, after another device, the backup code or the trusted person. */
export default function YoureIn({ next = "/home" }: { next?: string }) {
  const router = useRouter();
  const [device] = useState(thisDevice);

  useEffect(() => {
    router.prefetch(next);
  }, [next, router]);

  function go() {
    router.replace(next);
  }

  return (
    <div className="text-center">
      <span role="status" className="sr-only">
        Unlocked
      </span>
      <Celebration tone="positive" className="mb-5">
        <CheckIcon size={32} strokeWidth={2.6} />
      </Celebration>
      <PageTitle className="mb-3">You’re in</PageTitle>
      <Lead className="mb-9">This {device} can now open your record.</Lead>
      <Button variant="inkDeep" size="block" onClick={go}>
        Go to my record
      </Button>
      <QuietLink onClick={() => router.replace(NEW_BACKUP_CODE)} className="mt-4">
        Make a new backup code
      </QuietLink>
    </div>
  );
}
