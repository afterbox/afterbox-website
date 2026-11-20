import type { ReactNode } from "react";

const widths = {
  /** Home: the main area plus the 340px side column. */
  wide: "max-w-[1160px]",
  /** Everything else: 720px. */
  narrow: "max-w-[800px]",
} as const;

/**
 * The content column. Phones: 24px sides (16px on top for settings pages, which have no wordmark bar).
 * From 640px: 72px above, 96px below, centred in the space right of the rail.
 */
export default function Page({
  width = "narrow",
  settings = false,
  children,
}: {
  width?: keyof typeof widths;
  settings?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`mx-auto w-full px-6 pb-10 sm:px-10 sm:pt-[72px] sm:pb-24 ${settings ? "pt-4" : "pt-6"} ${widths[width]}`}
    >
      {children}
    </div>
  );
}
