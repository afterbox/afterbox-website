import type { ReactNode } from "react";

/** The translucent card that sits over (or, on mobile, just under) photos. Padding and position come from the caller. */
export default function FloatingCard({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`rounded-panel bg-card/95 shadow-float ${className}`}>{children}</div>;
}
