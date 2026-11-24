"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CheckIcon, ChevronDownIcon } from "@/components/ui/icons";
import { fieldClasses } from "@/components/ui/TextField";
import { transition } from "@/lib/motion";
import { useMotionTokens } from "@/lib/useMotionTokens";

export type SelectOption = { value: string; label: string };

type SelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  /**
   * "field" (default): the label above a field, like every other form field.
   * "inline": the label inside the field on the left, the choice on the right (onboarding 12).
   */
  look?: "field" | "inline";
  className?: string;
  /** Extra content beside the label (field look only). */
  aside?: ReactNode;
};

const PAGE = 10;
const TYPEAHEAD_MS = 600;

/**
 * The design system's select: a field that opens a list under it. It follows the WAI-ARIA "select-only combobox"
 * pattern: focus stays on the field (role="combobox") and the list's active option is announced through
 * aria-activedescendant.
 * - Closed: Enter, Space, ↓ or ↑ open it; Home and End open it at the first or last option; typing jumps to an option.
 * - Open: ↑ ↓ Home End PageUp PageDown move, Enter or Space choose, Tab chooses and moves on, Esc closes without
 *   choosing (and doesn't close the overlay it's in); typing jumps to the next option starting with those letters.
 * - A click outside closes it.
 */
export default function Select({ label, value, onChange, options, disabled = false, look = "field", className = "", aside }: SelectProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [active, setActive] = useState(selectedIndex);
  const root = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const { move } = useMotionTokens();
  const selected = options.find((option) => option.value === value);

  // Esc closes the list, not the overlay around it (the overlay listens natively on its own node, so this must too).
  useEffect(() => {
    const node = field.current;
    if (!node || !open) return;
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
    }
    node.addEventListener("keydown", onKey);
    return () => node.removeEventListener("keydown", onKey);
  }, [open]);

  // A click outside closes it.
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // Keep the active option in view.
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${id}-option-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [id, open, active]);

  function show(at = selectedIndex) {
    if (disabled || options.length === 0) return;
    setActive(at);
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    setOpen(false);
    field.current?.focus();
    if (option && option.value !== value) onChange(option.value);
  }

  /** The next option (after `from`) whose label starts with what was typed in the last moment. */
  function typeahead(key: string, from: number) {
    const now = Date.now();
    const text = now - typed.current.at > TYPEAHEAD_MS ? key : typed.current.text + key;
    typed.current = { text, at: now };
    const lower = text.toLowerCase();
    const repeat = lower.length > 1 && [...lower].every((char) => char === lower[0]);
    const needle = repeat ? lower[0] : lower;
    const start = repeat || lower.length === 1 ? from + 1 : from;
    for (let step = 0; step < options.length; step++) {
      const index = (start + step) % options.length;
      if (options[index].label.toLowerCase().startsWith(needle)) return index;
    }
    return -1;
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    const last = options.length - 1;
    const printable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        show();
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        show(event.key === "Home" ? 0 : last);
      } else if (printable) {
        const index = typeahead(event.key, selectedIndex);
        if (index >= 0) show(index);
      }
      return;
    }

    if (event.key === "Tab") {
      choose(active);
      return;
    }
    if (event.key === "Enter" || (event.key === " " && Date.now() - typed.current.at > TYPEAHEAD_MS)) {
      event.preventDefault();
      choose(active);
      return;
    }
    const moves: Record<string, () => number> = {
      ArrowDown: () => Math.min(last, active + 1),
      ArrowUp: () => (event.altKey ? active : Math.max(0, active - 1)),
      Home: () => 0,
      End: () => last,
      PageDown: () => Math.min(last, active + PAGE),
      PageUp: () => Math.max(0, active - PAGE),
    };
    if (event.key === "ArrowUp" && event.altKey) {
      event.preventDefault();
      choose(active);
      return;
    }
    if (moves[event.key]) {
      event.preventDefault();
      setActive(moves[event.key]());
      return;
    }
    if (printable) {
      event.preventDefault();
      const index = typeahead(event.key, active);
      if (index >= 0) setActive(index);
    }
  }

  const inline = look === "inline";

  return (
    <div ref={root} className={`relative ${className}`}>
      {!inline && (
        <div className="flex items-baseline justify-between gap-3">
          <span id={labelId} className="mb-1.5 block text-[13px] font-semibold text-ink">
            {label}
          </span>
          {aside}
        </div>
      )}
      <button
        ref={field}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={`${fieldClasses()} flex cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-default disabled:opacity-50 ${
          inline ? "text-[15px]" : ""
        } ${open ? "border-ink-deep shadow-[inset_0_0_0_0.5px_var(--color-ink-deep)]" : ""}`}
      >
        {inline && (
          <span id={labelId} className="flex-none">
            {label}
          </span>
        )}
        <span className={`flex min-w-0 items-center gap-1.5 ${inline ? "" : "flex-1"}`}>
          <span className={`truncate ${selected ? "text-ink" : "text-ink-soft/70"}`}>
            {selected?.label ?? "Choose"}
          </span>
          {inline && <ChevronDownIcon size={16} className={`flex-none text-ink-soft/70 transition-transform duration-[var(--motion-fast)] ${open ? "rotate-180" : ""}`} />}
        </span>
        {!inline && (
          <ChevronDownIcon size={16} className={`flex-none text-ink-soft/70 transition-transform duration-[var(--motion-fast)] ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={list}
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
            tabIndex={-1}
            initial={{ opacity: 0, y: move(-4), scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: transition("fast") }}
            transition={transition("fast")}
            className="absolute inset-x-0 top-full z-30 mt-2 max-h-[264px] origin-top overflow-y-auto overscroll-contain rounded-panel bg-card p-1.5 shadow-pop ring-1 ring-line"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  // Keep focus on the field: the list is driven from it.
                  onMouseDown={(event) => event.preventDefault()}
                  onPointerMove={() => active !== index && setActive(index)}
                  onClick={() => choose(index)}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-field px-3 text-[15px] text-ink ${
                    index === active ? "bg-ground" : ""
                  } ${isSelected ? "font-semibold" : ""}`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <CheckIcon size={16} className="flex-none text-ink-deep" />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
