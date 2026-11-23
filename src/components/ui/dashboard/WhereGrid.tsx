"use client";

import { CheckIcon } from "@/components/ui/icons";
import type { CategoryId } from "@/lib/api/types";
import type { CategoryInfo } from "@/lib/categories";
import { pressable } from "@/lib/motion";
import { CategoryGlyph, Square } from "./bits";

/** "Where does it go?": the categories in the API's picker order, one chosen. */
export default function WhereGrid({ categories, value, onPick }: { categories: CategoryInfo[]; value: CategoryId; onPick: (id: CategoryId) => void }) {
  return (
    <div role="radiogroup" aria-label="Where does it go?" className="mb-6 grid grid-cols-2 gap-2.5">
      {categories.map((category) => {
        const selected = category.id === value;
        return (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onPick(category.id)}
            className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-panel border p-3.5 text-left transition-[background-color,border-color,box-shadow] duration-[var(--motion-fast)] ${pressable} ${
              selected ? "border-ink-deep bg-mist shadow-[inset_0_0_0_0.5px_var(--color-ink-deep)]" : "border-line bg-ground hover:bg-card"
            }`}
          >
            <Square size={32} tone={selected ? "card" : "mist"}>
              <CategoryGlyph icon={category.icon} size={16} />
            </Square>
            <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{category.label}</span>
            {selected && <CheckIcon size={16} strokeWidth={2.4} className="flex-none text-ink-deep" />}
          </button>
        );
      })}
    </div>
  );
}

