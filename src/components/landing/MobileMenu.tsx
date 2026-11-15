"use client";

import Link from "next/link";
import { useRef } from "react";
import Button from "@/components/ui/Button";

type MenuLink = { href: string; label: string };

const iconButton =
  "flex size-11 items-center justify-center rounded-full border border-on-night/50";

/**
 * Menu button plus a full-screen menu, shown below 768px. The menu is a native
 * modal <dialog>, which gives the focus trap, Escape to close and inert page for free.
 */
export default function MobileMenu({ links }: { links: MenuLink[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Stop the page behind from scrolling while the menu covers it.
  const lockScroll = (locked: boolean) => {
    document.documentElement.style.overflow = locked ? "hidden" : "";
  };

  const open = () => {
    dialogRef.current?.showModal();
    closeRef.current?.focus();
    lockScroll(true);
  };

  const close = () => {
    dialogRef.current?.close();
    lockScroll(false);
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
        onClose={() => lockScroll(false)}
        className="fixed inset-0 m-0 size-full max-h-none max-w-none flex-col bg-ink-deep p-2 text-on-night open:flex"
      >
        <div className="flex items-center justify-between py-3 pr-3 pl-5">
          <Link href="/" onClick={close} className="text-[22px] font-semibold tracking-[-0.035em]">
            afterbox
          </Link>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close menu"
            onClick={close}
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
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={close}
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
