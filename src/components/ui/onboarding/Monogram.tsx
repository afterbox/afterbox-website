const sizes = {
  sm: "size-9 text-xs/[normal]",
  md: "size-12 text-base",
  lg: "size-14 text-[19px]",
} as const;

/** Letters in a mist circle, standing in for a bank or merchant logo. */
export default function Monogram({ letters, size = "sm" }: { letters: string; size?: keyof typeof sizes }) {
  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center rounded-full bg-mist font-semibold text-ink-deep ${sizes[size]}`}
    >
      {letters}
    </span>
  );
}
