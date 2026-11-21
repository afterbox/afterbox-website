"use client";

import { Link } from "@/components/ui/Links";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import BackButton from "@/components/ui/BackButton";
import { authHref, DEMO_EMAIL, readMode } from "@/lib/mock-auth";
import { lockSession } from "@/lib/security/store";

const AuthShellContext = createContext<{ setLeaving: (leaving: boolean) => void }>({ setLeaving: () => { } });

/** Lets a screen fade the Back button and terms out as it hands over to onboarding. */
export const useAuthShell = () => useContext(AuthShellContext);

function VerifyBackButton() {
  const params = useSearchParams();
  return <BackButton fallbackHref={authHref(readMode(params.get("from")), params.get("email") ?? DEMO_EMAIL)} />;
}

/**
 * Wordmark on top, terms line at the bottom, content centred on 640px and up.
 * On /verify the header gains a Back button (phones show only that) and phones hide the terms.
 */
export default function AuthShell({ children }: { children: ReactNode }) {
  // While leaving, the shell is pinned where it sits: the next layout mounts above it before this
  // one is hidden, and the card has to be measured in place to hand over to the onboarding card.
  const [pinnedTop, setPinnedTop] = useState<number | null>(null);
  const leaving = pinnedTop !== null;
  const setLeaving = useCallback((value: boolean) => setPinnedTop(value ? -window.scrollY : null), []);
  const fade = `transition-opacity duration-200 ${leaving ? "pointer-events-none opacity-0" : ""}`;
  const isVerify = usePathname() === "/verify";

  // Signed out: the record locks again, but this device keeps its part, so signing back in is one Unlock.
  useEffect(() => lockSession(), []);

  return (
    <AuthShellContext value={{ setLeaving }}>
      <div
        className={`flex min-h-dvh flex-col ${leaving ? "fixed inset-x-0" : ""}`}
        style={leaving ? { top: pinnedTop } : undefined}
      >
        <header className="flex h-[52px] shrink-0 items-center justify-between px-6 sm:h-[88px] sm:px-10">
          <Link
            href="/"
            name="auth-wordmark"
            className={`text-[22px] font-semibold tracking-[-0.035em] text-ink sm:text-[26px] ${isVerify ? "max-sm:hidden" : ""}`}
          >
            afterbox
          </Link>
          {isVerify && (
            <div className={fade}>
              <Suspense fallback={<BackButton fallbackHref="/signup" />}>
                <VerifyBackButton />
              </Suspense>
            </div>
          )}
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
        <footer
          className={`shrink-0 px-6 pt-6 pb-10 sm:flex sm:h-[88px] sm:items-end sm:justify-center sm:p-0 sm:pb-8 ${fade} ${isVerify ? "max-sm:hidden" : ""
            }`}
        >
          <p className="text-center text-xs/[17px] text-ink-soft/70">
            By continuing you agree to our{" "}
            <Link href="/terms" name="auth-terms" className="underline hover:text-ink-soft">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" name="auth-privacy" className="underline hover:text-ink-soft">
              Privacy Policy
            </Link>
            .
          </p>
        </footer>
      </div>
    </AuthShellContext>
  );
}
