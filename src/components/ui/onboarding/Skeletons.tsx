import { Sk } from "@/components/ui/dashboard/Skeleton";

/** Shapes the size of the content they stand in for, so nothing moves when it arrives. */

export function Busy({ children, label = "Loading" }: { children: React.ReactNode; label?: string }) {
  return (
    <div aria-busy="true">
      <span role="status" className="sr-only">
        {label}
      </span>
      {children}
    </div>
  );
}

export function BankListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <Busy>
      <Sk className="h-[52px] w-full rounded-field" />
      <div className="mt-3.5">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className={`flex items-center gap-3.5 px-1 py-3.5 sm:py-[15px] ${index < rows - 1 ? "border-b border-line" : ""}`}>
            <Sk round className="size-9 flex-none" />
            <Sk className="h-3.5 w-[38%]" />
          </div>
        ))}
      </div>
    </Busy>
  );
}

export function FoundSkeleton() {
  return (
    <Busy>
      <Sk className="mx-auto mb-3 h-3 w-40" />
      <Sk className="mx-auto mb-3 h-12 w-56" />
      <Sk className="mx-auto mb-9 h-3.5 w-32" />
      <div className="mb-[34px] flex flex-col gap-2.5 sm:grid sm:grid-cols-2">
        <Sk className="h-[62px] w-full rounded-panel" />
        <Sk className="h-[62px] w-full rounded-panel" />
      </div>
      <div className="mb-[34px] border-t border-line">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 border-b border-line py-3.5">
            <Sk className="size-8 flex-none" />
            <Sk className="h-3.5 flex-1" />
            <Sk className="h-3 w-16" />
          </div>
        ))}
      </div>
      <Sk round className="h-[52px] w-full" />
    </Busy>
  );
}

export function FindingListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Busy>
      <div className="mb-1.5 flex items-center gap-3">
        <Sk className="size-10 flex-none" />
        <div className="flex-1">
          <Sk className="mb-2 h-6 w-40" />
          <Sk className="h-3 w-48" />
        </div>
      </div>
      <div className="mt-[26px] mb-[34px] border-t border-line">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3 border-b border-line py-[17px]">
            <Sk round className="size-9 flex-none" />
            <div className="flex-1">
              <Sk className="mb-2 h-3.5 w-[45%]" />
              <Sk className="h-3 w-[65%]" />
            </div>
            <Sk className="h-3.5 w-14" />
          </div>
        ))}
      </div>
      <Sk round className="h-[52px] w-full" />
    </Busy>
  );
}
