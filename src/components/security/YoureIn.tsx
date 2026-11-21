"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { Celebration, Lead, PageTitle } from "@/components/ui/dashboard/bits";
import { deviceName, deviceWord } from "@/lib/security/device";
import { setUnlock } from "@/lib/security/store";

const thisDevice = () => deviceWord(deviceName().device);

/** 08: in on a new device, after another device, the backup code or the trusted person. */
export default function YoureIn() {
  const router = useRouter();
  const [device] = useState(thisDevice);

  useEffect(() => {
    router.prefetch("/home");
  }, [router]);

  function go() {
    setUnlock("open");
    router.replace("/home");
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
    </div>
  );
}
