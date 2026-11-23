"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { duration } from "@/lib/motion";
import { useAuthShell } from "./AuthShell";

/**
 * Hands the auth card over to onboarding once `href` is set: after `hold` ms the card's content
 * (and the shell's Back and terms) fade out, then the route is replaced so Back can't return to a
 * finished step. Returns whether the content is fading out.
 */
export function useHandOff(href: string | null, hold = 0) {
  const router = useRouter();
  const { setLeaving } = useAuthShell();
  const [leaving, setContentLeaving] = useState(false);

  useEffect(() => {
    if (!href) return;
    router.prefetch(href);
    const timers = [
      setTimeout(() => {
        setContentLeaving(true);
        setLeaving(true);
      }, hold),
      setTimeout(() => router.replace(href), hold + duration.fast * 1000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [href, hold, router, setLeaving]);

  // Next keeps a visited page alive but hidden; coming back should find the card in place.
  useEffect(
    () => () => {
      setLeaving(false);
      setContentLeaving(false);
    },
    [setLeaving],
  );

  return leaving;
}
