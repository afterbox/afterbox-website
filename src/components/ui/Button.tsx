import { Link } from "@/components/ui/Links";
import type { MouseEventHandler, ReactNode } from "react";
import { pressable } from "@/lib/motion";
import Spinner from "./Spinner";

const variants = {
  ink: "bg-ink text-ground hover:opacity-85",
  inkDeep: "bg-ink-deep text-on-night hover:bg-ink-deep-hover",
  // Used over video, photos and dark backgrounds, so the focus ring is light too.
  light: "bg-on-night text-ink hover:opacity-85 focus-visible:outline-on-night",
  card: "border border-line bg-card text-ink hover:bg-ground",
  /** Quiet secondary inside a card, e.g. "Done" in onboarding. */
  ground: "border border-line bg-ground text-ink hover:bg-card",
  /** Confirms something that can't be undone from here, e.g. "Disconnect". */
  alert: "bg-alert text-on-night hover:opacity-90",
  /** Opens a destructive confirm, e.g. "Disconnect Monzo". */
  alertOutline: "border border-alert/35 bg-transparent text-alert hover:bg-alert/6",
} as const;

const disabledStyles = {
  ink: "data-disabled:opacity-35",
  inkDeep: "data-disabled:bg-ink-deep/35",
  light: "data-disabled:opacity-35",
  card: "data-disabled:opacity-40",
  ground: "data-disabled:opacity-40",
  alert: "data-disabled:opacity-35",
  alertOutline: "data-disabled:opacity-40",
} as const;

const spinnerColours: Partial<Record<keyof typeof variants, string>> = {
  card: "text-ink-soft",
  ground: "text-ink-soft",
  alertOutline: "text-alert",
};

const sizes = {
  sm: "px-[22px] py-3 text-[15px]/5",
  md: "px-6 py-3.5 text-[15px]/5",
  lg: "px-[30px] py-[17px] text-base/[21px]",
  /** Full-width button used in the auth forms: 48px on phones, 52px from 640px. */
  block: "h-12 w-full px-6 text-sm/5 tracking-[-0.01em] sm:h-[52px] sm:text-[15px]/5",
  /** The dashboard's "+ Add": 44px. */
  add: "h-11 gap-2 px-[18px] text-[15px]/5",
} as const;

type ButtonProps = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** Renders a link when set, a button otherwise. */
  href?: string;
  /** Short name for the link's prefetch (Foresight), e.g. "found-add-all". */
  name?: string;
  type?: "button" | "submit";
  /** Shows the spinner alone and blocks clicks, but keeps the full colour and the same width. */
  loading?: boolean;
  /** What screen readers hear while loading, e.g. "Sending code". */
  loadingLabel?: string;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  children: ReactNode;
};

export default function Button({
  variant = "ink",
  size = "md",
  href,
  name,
  type = "button",
  loading = false,
  loadingLabel,
  disabled = false,
  onClick,
  className = "",
  children,
}: ButtonProps) {
  const classes = `relative inline-flex cursor-pointer items-center justify-center gap-2.5 whitespace-nowrap rounded-full font-semibold ${pressable} disabled:pointer-events-none disabled:cursor-default ${variants[variant]} ${disabledStyles[variant]} ${sizes[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} name={name} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-disabled={(disabled && !loading) || undefined}
      onClick={onClick}
      className={classes}
    >
      {loading ? (
        <>
          <span aria-hidden="true" className="invisible contents">
            {children}
          </span>
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner className={spinnerColours[variant] ?? ""} />
          </span>
        </>
      ) : (
        children
      )}
      <span role="status" className="sr-only">
        {loading ? loadingLabel : ""}
      </span>
    </button>
  );
}
