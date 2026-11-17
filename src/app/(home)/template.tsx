import type { ReactNode } from "react";

/** Re-mounts on every route change, so the card fades and rises in each time. */
export default function AuthTemplate({ children }: { children: ReactNode }) {
  return <div className="auth-enter flex flex-1 flex-col sm:items-center sm:justify-center">{children}</div>;
}
