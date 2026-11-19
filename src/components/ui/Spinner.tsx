/** 16px ring that takes the current text colour. Fades in when it appears. */
export default function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`spinner inline-block size-4 shrink-0 rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}
