import { Link } from "@/components/ui/Links";
import type { ReactNode } from "react";
import BackButton from "@/components/ui/BackButton";

/** Wordmark and Back on 640px and up; phones show only Back. */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="flex h-[52px] items-center justify-between px-6 sm:h-[88px] sm:px-10">
        <Link href="/" name="legal-wordmark" className="text-[26px] font-semibold tracking-[-0.035em] text-ink max-sm:hidden">
          afterbox
        </Link>
        <BackButton />
      </header>
      <main>{children}</main>
    </div>
  );
}
