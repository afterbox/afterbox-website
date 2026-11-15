import type { ReactNode } from "react";

const variants = {
  ink: "bg-ink text-ground hover:opacity-85",
  inkDeep: "bg-ink-deep text-on-night hover:bg-ink-deep-hover",
  // Used over video, photos and dark backgrounds, so the focus ring is light too.
  light: "bg-on-night text-ink hover:opacity-85 focus-visible:outline-on-night",
} as const;

const sizes = {
  sm: "px-[22px] py-3 text-[15px]/5",
  md: "px-6 py-3.5 text-[15px]/5",
  lg: "px-[30px] py-[17px] text-base/[21px]",
} as const;

type ButtonProps = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** Renders a link when set, a button otherwise. */
  href?: string;
  type?: "button" | "submit";
  className?: string;
  children: ReactNode;
};

export default function Button({
  variant = "ink",
  size = "md",
  href,
  type = "button",
  className = "",
  children,
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold transition-[opacity,background-color] duration-200 ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes}>
      {children}
    </button>
  );
}
