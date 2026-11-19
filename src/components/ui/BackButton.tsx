"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { ChevronLeftIcon } from "./icons";

type NavigationLike = { currentEntry: { index: number } | null };
type RouterLike = Pick<ReturnType<typeof useRouter>, "back" | "push">;

/** Back in history when the previous page was ours, otherwise to `fallbackHref`. */
export function goBack(router: RouterLike, fallbackHref: string) {
  if (cameFromThisSite()) router.back();
  else router.push(fallbackHref);
}

/** Whether the previous history entry is a page on this site. */
function cameFromThisSite() {
  // The Navigation API only lists same-origin entries, so any entry before this one is ours.
  const navigation = (window as Window & { navigation?: NavigationLike }).navigation;
  if (navigation?.currentEntry) return navigation.currentEntry.index > 0;
  return window.history.length > 1 && document.referrer.startsWith(window.location.origin);
}

/**
 * Goes back in history when the previous page was on this site, otherwise to `fallbackHref`.
 * A bare chevron with a 44px tap target on phones, a 40px outlined circle from 640px.
 */
export default function BackButton({ fallbackHref = "/" }: { fallbackHref?: string }) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !cameFromThisSite()) return;
    event.preventDefault();
    router.back();
  }

  return (
    <Link
      href={fallbackHref}
      onClick={handleClick}
      aria-label="Back"
      className="flex items-center justify-center text-ink transition-colors duration-200 max-sm:-ml-[17px] max-sm:size-11 sm:size-10 sm:rounded-full sm:border sm:border-line sm:hover:bg-card"
    >
      <ChevronLeftIcon className="size-[22px] sm:size-[18px]" />
    </Link>
  );
}
