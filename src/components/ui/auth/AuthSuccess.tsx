"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { useAuthShell } from "./AuthShell";

/** Shown in the card once the code (or Google) checks out. */
export default function AuthSuccess() {
  const { setFinished } = useAuthShell();

  useEffect(() => {
    setFinished(true);
    return () => setFinished(false);
  }, [setFinished]);

  return (
    <div className="auth-fade text-center">
      <span className="mx-auto mt-1 mb-5 flex size-16 items-center justify-center rounded-full bg-positive/10 text-positive">
        <CheckIcon size={30} />
      </span>
      <h1 className="mb-2 text-[30px]/[1.1] font-normal tracking-[-0.035em] text-ink sm:text-[32px]/[1.1]">
        You&apos;re in
      </h1>
      <p className="mb-6 text-sm text-ink-soft sm:text-[15px]">Next, we&apos;ll connect your bank.</p>
      <Button href="/start" variant="inkDeep" size="block">
        Continue
      </Button>
    </div>
  );
}
