import type { ReactNode } from "react";
import { FlowJoins } from "./FlowBackground";
import SecurityKey from "./SecurityKey";

const facts: { text: string; icon: ReactNode }[] = [
  {
    text: "Protected with AES-256, the encryption banks use.",
    icon: (
      <>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
  },
  {
    text: "We never store passwords, PINs or card numbers.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M5.6 5.6l12.8 12.8" />
      </>
    ),
  },
  {
    text: "What you share with someone, they can see anytime.",
    icon: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M17 11l2 2 4-4" />
      </>
    ),
  },
  {
    text: "Everything else stays locked until it's needed.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
];

export default function Security() {
  return (
    // Keep this section free of transform, opacity and z-index: see FlowBackground.tsx.
    <section
      id="security"
      className="relative scroll-mt-6 bg-ink-deep px-5 pt-24 pb-24 text-on-night md:px-page md:pt-[140px] md:pb-[120px]"
    >
      <FlowJoins />

      <div className="mx-auto max-w-[1344px]">
        {/*
          Row 1. Desktop: title | key | explanation. Tablet: stacked in that order.
          Mobile follows its own design: title, explanation, then the key.
        */}
        <div
          data-rise
          className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_320px_minmax(0,1fr)] lg:items-center lg:gap-12 xl:grid-cols-3"
        >
          <h2 className="mb-4 text-[40px]/[44px] tracking-[-0.04em] md:mb-12 md:text-display-m lg:mb-0">
            Private until you share it.
          </h2>
          <SecurityKey className="max-md:order-2 lg:justify-self-center" />
          <p className="mb-7 text-base/[25px] text-on-night-soft max-md:order-1 md:mt-12 md:mb-0 md:max-w-[560px] md:text-xl/[30px] lg:mt-0 lg:max-w-[380px] lg:justify-self-end">
            Your record is locked with one key, split into three parts. You, afterbox and your
            trusted person each hold one. No single part can open it.
          </p>
        </div>

        {/* Row 2: the four facts. One column on mobile (no icons, as designed), 2×2 on tablet, four across on desktop. */}
        <ul
          data-rise
          className="mt-14 flex flex-col gap-4 md:mt-[140px] md:grid md:grid-cols-2 md:gap-10 lg:grid-cols-4"
        >
          {facts.map((fact) => (
            <li key={fact.text} className="border-t border-on-night/22 pt-3.5 md:pt-7">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="stroke-glass max-md:hidden"
              >
                {fact.icon}
              </svg>
              <p className="text-lg/[25px] md:mt-5 md:text-xl/[27px]">{fact.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
