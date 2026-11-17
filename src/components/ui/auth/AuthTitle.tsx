import type { ReactNode } from "react";

export default function AuthTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-7 text-center">
      <h1 className={`text-[27px]/[1.1] font-normal tracking-[-0.035em] text-ink sm:text-[32px]/[1.1] ${children ? "mb-2" : ""}`}>
        {title}
      </h1>
      {children && <div className="text-[15px]/[22px] text-ink-soft">{children}</div>}
    </div>
  );
}
