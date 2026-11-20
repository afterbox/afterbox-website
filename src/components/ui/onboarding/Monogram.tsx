const sizes = {
  xs: "size-6 text-[8px]",
  sm: "size-9 text-xs/[normal]",
  row: "size-10 text-[13px]",
  md: "size-12 text-base",
  lg: "size-14 text-[19px]",
  xl: "size-16 text-[21px]",
} as const;

/** Letters in a mist circle, standing in for a bank or merchant logo. */
export default function Monogram({
  letters,
  size = "sm",
  className = "",
}: {
  letters: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center rounded-full bg-mist font-semibold text-ink-deep ${sizes[size]} ${className}`}
    >
      {letters}
    </span>
  );
}
