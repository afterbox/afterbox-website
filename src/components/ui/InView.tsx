"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Sets data-inview="true" | "false" on its element as it enters and leaves the
 * viewport, so CSS can pause animations that nobody can see. It writes the
 * attribute directly rather than through state, so it never re-renders.
 */
export default function InView({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      el.dataset.inview = String(entry.isIntersecting);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
