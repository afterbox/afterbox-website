"use client";

import { motion } from "motion/react";
import { transition } from "@/lib/motion";

const options = [
  { value: "keep", label: "Keep" },
  { value: "cancel", label: "Cancel" },
] as const;

type KeepCancelProps = {
  /** Names the group for screen readers, e.g. "Netflix". */
  name: string;
  id: string;
  cancel: boolean;
  onChange: (cancel: boolean) => void;
};

/**
 * Keep / Cancel pill switch. Real radio buttons, so arrow keys and screen readers just work.
 * The highlight slides between the two.
 */
export default function KeepCancel({ name, id, cancel, onChange }: KeepCancelProps) {
  return (
    <div role="radiogroup" aria-label={name} className="inline-flex flex-none rounded-full border border-line bg-ground p-[3px]">
      {options.map((option) => {
        const checked = (option.value === "cancel") === cancel;
        return (
          <label
            key={option.value}
            className={`relative flex h-[30px] cursor-pointer items-center rounded-full px-3 text-[13px] font-semibold transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink-deep ${
              checked ? "text-on-night" : "text-ink-soft hover:text-ink"
            }`}
          >
            <input
              type="radio"
              name={`keep-cancel-${id}`}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value === "cancel")}
              className="sr-only"
            />
            {checked && (
              <motion.span
                layoutId={`keep-cancel-${id}`}
                transition={transition("base")}
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-ink-deep"
              />
            )}
            <span className="relative">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
