"use client";

import { useState } from "react";
import { faqs } from "@/content/faqs";

const bar = "absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-ink";

/** Accordion: one item open at a time, the first open on load, and the open item can be closed. */
export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-6 px-5 pt-12 pb-[120px] md:px-page md:pt-20 md:pb-[200px]">
      <div data-rise className="mx-auto max-w-[1344px] lg:grid lg:grid-cols-3 lg:gap-12">
        <h2 className="mb-5 text-[32px]/[36px] tracking-[-0.03em] md:mb-8 md:text-display-s lg:mb-0">
          Questions
        </h2>

        <div className="border-t border-line lg:col-span-2">
          {faqs.map((faq, i) => {
            const open = i === openIndex;

            return (
              // The item's vertical padding is split between the button, the answer and
              // this wrapper so the closed and open heights both match the design.
              <div key={faq.question} className="border-b border-line pb-2 md:pb-3">
                <h3>
                  <button
                    type="button"
                    id={`faq-question-${i}`}
                    aria-expanded={open}
                    aria-controls={`faq-answer-${i}`}
                    onClick={() => setOpenIndex(open ? null : i)}
                    className="flex w-full items-start justify-between gap-6 pt-[18px] pb-2.5 text-left text-[17px]/6 font-medium md:pt-6 md:pb-3 md:text-xl/7"
                  >
                    {faq.question}
                    {/* Plus that becomes a minus: the upright bar turns to lie flat */}
                    <span aria-hidden="true" className="relative mt-1 size-4 shrink-0 md:mt-1.5">
                      <span className={bar} />
                      <span
                        className={`${bar} transition-transform duration-300 ${open ? "" : "rotate-90"}`}
                      />
                    </span>
                  </button>
                </h3>

                {/* Height animates by growing the grid row from 0fr to 1fr, so no measuring is needed */}
                <div
                  id={`faq-answer-${i}`}
                  role="region"
                  aria-labelledby={`faq-question-${i}`}
                  inert={!open}
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ${
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <p className="max-w-[640px] pb-2.5 text-[15px]/[23px] text-ink-soft md:pb-3 md:text-base/[25px]">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
