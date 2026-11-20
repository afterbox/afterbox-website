import { Link } from "@/components/ui/Links";
import type { ReactNode } from "react";
import { pressable } from "@/lib/motion";

type QuietLinkProps = {
  href?: string;
  onClick?: () => void;
  /** Space above, e.g. "mt-4". */
  className?: string;
  children: ReactNode;
};

const linkClasses = `inline-block cursor-pointer font-semibold text-ink-soft hover:text-ink ${pressable}`;

/** The centred secondary action under a button: 13px on phones, 14px from 640px. */
export default function QuietLink({ href, onClick, className = "", children }: QuietLinkProps) {
  return (
    <p className={`text-center text-[13px] sm:text-sm/[normal] ${className}`}>
      {href ? (
        <Link href={href} className={linkClasses}>
          {children}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={linkClasses}>
          {children}
        </button>
      )}
    </p>
  );
}
