import type { ReactNode } from "react";

/** Card on 640px and up; on phones the content sits straight on the page. */
export default function AuthCard({ children }: { children: ReactNode }) {
  return (
    <section className="w-full px-6 pt-[52px] pb-8 sm:w-[440px] sm:-translate-y-[2%] sm:rounded-card sm:bg-card sm:px-10 sm:pt-11 sm:pb-9 sm:shadow-card">
      {children}
    </section>
  );
}
