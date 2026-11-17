/** 16px ring that takes the current text colour. */
export default function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-4 shrink-0 animate-[spin_0.8s_linear_infinite] rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}
