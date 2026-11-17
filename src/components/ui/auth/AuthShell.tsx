"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, Suspense, useContext, useState, type ReactNode } from "react";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { authHref, DEMO_EMAIL, readMode } from "@/lib/mock-auth";

const AuthShellContext = createContext<{ setFinished: (finished: boolean) => void }>({
  setFinished: () => {},
});

/** Lets the success view drop the Back button and bring the wordmark back. */
export const useAuthShell = () => useContext(AuthShellContext);

function BackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Back"
      className="flex items-center justify-center text-ink transition-colors duration-200 max-sm:-ml-[17px] max-sm:size-11 sm:size-10 sm:rounded-full sm:border sm:border-line sm:hover:bg-card"
    >
      <ChevronLeftIcon className="size-[22px] sm:size-[18px]" />
    </Link>
  );
}

function VerifyBackLink() {
  const params = useSearchParams();
  return <BackLink href={authHref(readMode(params.get("from")), params.get("email") ?? DEMO_EMAIL)} />;
}

/**
 * Wordmark on top, terms line at the bottom, content centred on 640px and up.
 * On /verify the header gains a Back button (phones show only that) and phones hide the terms.
 */
export default function AuthShell({ children }: { children: ReactNode }) {
  const [finished, setFinished] = useState(false);
  const isVerify = usePathname() === "/verify";
  const showBack = isVerify && !finished;

  return (
    <AuthShellContext value={{ setFinished }}>
      <div className="flex min-h-dvh flex-col">
        <header className="flex h-[52px] shrink-0 items-center justify-between px-6 sm:h-[88px] sm:px-10">
          <Link
            href="/"
            className={`text-[22px] font-semibold tracking-[-0.035em] text-ink sm:text-[26px] ${showBack ? "max-sm:hidden" : ""}`}
          >
            afterbox
          </Link>
          {showBack && (
            <Suspense fallback={<BackLink href="/signup" />}>
              <VerifyBackLink />
            </Suspense>
          )}
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
        <footer
          className={`shrink-0 px-6 pt-6 pb-10 sm:flex sm:h-[88px] sm:items-end sm:justify-center sm:p-0 sm:pb-8 ${
            isVerify || finished ? "max-sm:hidden" : ""
          }`}
        >
          <p className="text-center text-xs/[17px] text-ink-soft/70">
            By continuing you agree to our <u>Terms</u> and <u>Privacy Policy</u>.
          </p>
        </footer>
      </div>
    </AuthShellContext>
  );
}
