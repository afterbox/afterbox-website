"use client";

import Link from "next/link";
import { useRef, type MouseEvent } from "react";
import Button from "@/components/ui/Button";

type MenuLink = { href: string; label: string };

const iconButton =
  "flex size-11 items-center justify-center rounded-full border border-on-night/50";

/*
  Open: fades in and slides down 12px (280ms, ease-out), starting from @starting-style.
  Close: data-closing plays it in reverse (200ms), then dialog.close() runs.
  Reduced motion: a quick fade, no slide. The trailing ! beats the global reduced-motion
  override in globals.css, which would otherwise make the fade instant.
*/
const dialogMotion = [
  "opacity-0 transition-[opacity,translate,display,overlay] transition-discrete duration-280 ease-out",
  "open:opacity-100 starting:open:opacity-0 not-open:pointer-events-none",
  "motion-safe:-translate-y-3 motion-safe:open:translate-y-0 motion-safe:starting:open:-translate-y-3",
  "open:data-closing:opacity-0 motion-safe:open:data-closing:-translate-y-3 data-closing:duration-200 data-closing:ease-in",
  "motion-reduce:duration-150!",
].join(" ");

// Links fade and rise in one after another as the menu opens.
const linkMotion =
  "transition-[opacity,translate] duration-280 ease-out starting:opacity-0 motion-safe:starting:translate-y-2";

// Stop the page behind from scrolling while the menu covers it.
function lockScroll(locked: boolean) {
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

/**
 * Menu button plus a full-screen menu, shown below 768px. The menu is a native
 * modal <dialog>, which gives the focus trap, Escape to close and inert page for free.
 */
export default function MobileMenu({ links }: { links: MenuLink[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const open = () => {
    dialogRef.current?.showModal();
    closeRef.current?.focus();
    lockScroll(true);
  };

  // Animates out, then closes for real. The timer covers a transitionend that never comes.
  const close = (then?: () => void) => {
    const dialog = dialogRef.current;
    if (!dialog?.open || "closing" in dialog.dataset) return;
    dialog.dataset.closing = "";

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      dialog.removeEventListener("transitionend", onEnd);
      dialog.close();
      lockScroll(false);
      then?.();
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.target === dialog && e.propertyName === "opacity") finish();
    };
    dialog.addEventListener("transitionend", onEnd);
    setTimeout(finish, 300);
  };

  // Close first, then scroll, so the smooth scroll isn't hidden behind the fading menu.
  const goTo = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#")) {
      close();
      return;
    }
    e.preventDefault();
    close(() => {
      if (location.hash !== href) history.pushState(null, "", href);
      document.getElementById(href.slice(1))?.scrollIntoView();
    });
  };

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        onClick={open}
        className={iconButton}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 9h16" />
          <path d="M4 15h16" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Menu"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClose={(e) => {
          delete e.currentTarget.dataset.closing;
          lockScroll(false);
        }}
        className={`fixed inset-0 m-0 size-full max-h-none max-w-none flex-col bg-ink-deep p-2 text-on-night open:flex ${dialogMotion}`}
      >
        <div className="flex items-center justify-between py-3 pr-3 pl-5">
          <Link
            href="/"
            onClick={() => close()}
            className="text-[22px] font-semibold tracking-[-0.035em]"
          >
            afterbox
          </Link>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close menu"
            onClick={() => close()}
            className={iconButton}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
        </div>

        <ul className="mt-6 px-5">
          {links.map((link, i) => (
            <li key={link.href} className={linkMotion} style={{ transitionDelay: `${i * 40}ms` }}>
              <a
                href={link.href}
                onClick={(e) => goTo(e, link.href)}
                className="block py-3 text-[32px]/[36px] tracking-[-0.03em]"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-auto px-5 pb-6">
          <Button href="/start" variant="light" size="lg" className="w-full">
            Start your record
          </Button>
        </div>
      </dialog>
    </div>
  );
}
