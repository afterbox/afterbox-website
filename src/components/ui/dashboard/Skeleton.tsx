import type { ReactNode } from "react";
import { PageTitle } from "./bits";
import Page from "./Page";

/** One shimmering shape (ab-sk). Sizes are Tailwind classes, e.g. "h-3.5 w-[260px]". */
export function Sk({ className = "", round = false }: { className?: string; round?: boolean }) {
  return <span aria-hidden="true" className={`ab-sk block ${round ? "rounded-full" : "rounded-field"} ${className}`} />;
}

/** Announces the wait once; the shapes themselves are hidden from screen readers. */
function Busy({ children }: { children: ReactNode }) {
  return (
    <div aria-busy="true">
      <span role="status" className="sr-only">
        Loading
      </span>
      {children}
    </div>
  );
}

function TileSkeleton() {
  return (
    <div className="rounded-panel bg-card p-[18px] ring-1 ring-line sm:p-5">
      <Sk className="mb-[18px] size-9" />
      <Sk className="mb-2.5 h-[26px] w-10" />
      <Sk className="mb-2 h-3.5 w-[70%]" />
      <Sk className="mb-[18px] h-3 w-1/2" />
      <Sk className="h-3 w-[60%]" />
    </div>
  );
}

function RowSkeleton({ pill = true, last = false }: { pill?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center gap-3.5 py-4 ${last ? "" : "border-b border-line"}`}>
      <Sk round className="size-9 flex-none" />
      <div className="flex-1">
        <Sk className="mb-2 h-3.5 w-[40%]" />
        <Sk className="h-3 w-[60%]" />
      </div>
      {pill && <Sk round className="h-[26px] w-[90px] flex-none max-[400px]:w-[70px]" />}
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <Page width="wide">
      <Busy>
        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-16">
          <div>
            <Sk className="mb-4 h-12 w-[180px] sm:h-14" />
            <Sk className="h-3.5 w-[260px] max-w-full" />
            <div className="mt-7 grid grid-cols-2 gap-3 sm:mt-9 sm:gap-4 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <TileSkeleton key={index} />
              ))}
            </div>
          </div>
          <div className="mt-7 rounded-card bg-card p-6 ring-1 ring-line sm:p-7 lg:mt-0">
            <Sk className="mb-[18px] h-3 w-[70px]" />
            <Sk className="mb-4 size-11" />
            <Sk className="mb-2.5 h-6 w-[70%]" />
            <Sk className="mb-2 h-3.5 w-full" />
            <Sk className="mb-6 h-3.5 w-[60%]" />
            <Sk round className="h-12 w-full sm:h-[52px]" />
          </div>
        </div>
      </Busy>
    </Page>
  );
}

export function RecordSkeleton() {
  return (
    <Page>
      <PageTitle className="mb-6 sm:mb-8">Record</PageTitle>
      <Busy>
        <Sk className="mb-5 h-12 w-full sm:h-[52px]" />
        <div className="mb-8 flex gap-2">
          <Sk round className="h-[34px] w-[70px]" />
          <Sk round className="h-[34px] w-[120px]" />
          <Sk round className="h-[34px] w-[70px]" />
        </div>
        <Sk className="mb-2.5 h-3 w-[90px]" />
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton last />
      </Busy>
    </Page>
  );
}

export function CategorySkeleton() {
  return (
    <Page>
      <Busy>
        <Sk className="mb-6 h-3.5 w-[60px] max-sm:hidden" />
        <div className="mb-8 flex items-center gap-4">
          <Sk className="size-[52px] flex-none" />
          <div className="flex-1">
            <Sk className="mb-2.5 h-7 w-[160px]" />
            <Sk className="h-3.5 w-[180px] max-w-full" />
          </div>
        </div>
        <div className="border-t border-line">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton last />
        </div>
      </Busy>
    </Page>
  );
}

export function ItemSkeleton() {
  return (
    <Page>
      <Busy>
        <Sk className="mb-6 h-3.5 w-[80px] max-sm:hidden" />
        <div className="mb-6 flex items-center gap-4">
          <Sk round className="size-14 flex-none" />
          <div className="flex-1">
            <Sk className="mb-2.5 h-7 w-[200px] max-w-full" />
            <Sk className="h-3.5 w-[90px]" />
          </div>
        </div>
        <Sk className="mb-7 h-[52px] w-full rounded-panel" />
        <Sk className="mb-2 h-3 w-[70px]" />
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex justify-between border-b border-line py-3.5">
            <Sk className="h-3.5 w-[90px]" />
            <Sk className="h-3.5 w-[110px]" />
          </div>
        ))}
      </Busy>
    </Page>
  );
}

export function PeopleSkeleton() {
  return (
    <Page>
      <PageTitle className="mb-2">People</PageTitle>
      <p className="mb-6 text-sm/normal text-ink-soft sm:mb-10 sm:text-[15px]/normal">Who can find your record when it matters.</p>
      <Busy>
        <div className="flex items-center gap-3 rounded-panel bg-card p-4 ring-1 ring-line">
          <Sk round className="size-10 flex-none" />
          <div className="flex-1">
            <Sk className="mb-2 h-3.5 w-[40%]" />
            <Sk className="h-3 w-[25%]" />
          </div>
          <Sk round className="h-[26px] w-[80px] flex-none" />
        </div>
        <Sk className="mt-3 h-3 w-[60%]" />
        <Sk className="mt-7 h-[76px] w-full rounded-panel" />
      </Busy>
    </Page>
  );
}

export function SettingsSkeleton({ title }: { title?: string }) {
  return (
    <Page settings>
      {title ? <PageTitle className="mb-8 sm:mb-10">{title}</PageTitle> : <Sk className="mb-8 h-8 w-[160px] sm:mb-10" />}
      <Busy>
        <Sk className="mb-2 h-3 w-[120px]" />
        <RowSkeleton pill={false} />
        <RowSkeleton pill={false} />
        <RowSkeleton pill={false} last />
        <Sk className="mt-10 mb-2 h-3 w-[80px]" />
        <RowSkeleton pill={false} />
        <RowSkeleton pill={false} last />
      </Busy>
    </Page>
  );
}

export function FormSkeleton({ title }: { title: string }) {
  return (
    <Page settings>
      <PageTitle className="mb-8 sm:mb-10">{title}</PageTitle>
      <Busy>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="mb-5">
            <Sk className="mb-2 h-3 w-[90px]" />
            <Sk className="h-12 w-full sm:h-[52px]" />
          </div>
        ))}
      </Busy>
    </Page>
  );
}

export function BankSkeleton() {
  return (
    <Page settings>
      <Busy>
        <Sk className="mb-6 h-3.5 w-[70px] max-sm:hidden" />
        <div className="mb-7 flex items-center gap-4">
          <Sk round className="size-14 flex-none" />
          <div className="flex-1">
            <Sk className="mb-2.5 h-7 w-[120px]" />
            <Sk className="h-3.5 w-[220px] max-w-full" />
          </div>
        </div>
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex justify-between border-b border-line py-3.5">
            <Sk className="h-3.5 w-[90px]" />
            <Sk className="h-3.5 w-[110px]" />
          </div>
        ))}
      </Busy>
    </Page>
  );
}
