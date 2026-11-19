import { ShieldCheckIcon } from "@/components/ui/icons";

export default function TinkNote({ className = "" }: { className?: string }) {
  return (
    <p className={`flex items-center justify-center gap-[7px] text-[13px] text-ink-soft ${className}`}>
      <ShieldCheckIcon size={15} />
      Connected securely through Tink, part of Visa
    </p>
  );
}
