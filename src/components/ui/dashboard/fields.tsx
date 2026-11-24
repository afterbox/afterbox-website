"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import FormMessage from "@/components/ui/FormMessage";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon } from "@/components/ui/icons";
import Select, { type SelectOption } from "@/components/ui/Select";
import TextField, { fieldClasses } from "@/components/ui/TextField";
import { formatDate, formatMoneyTyping, parseTypedMinor, toIso, todayIso, typedFromMinor } from "@/lib/dashboard/format";
import { currencySymbol } from "@/lib/money";
import { pressable, transition } from "@/lib/motion";
import { useMotionTokens } from "@/lib/useMotionTokens";
import { DialogTitle, PhoneSheet, useLayers } from "./Layer";
import { useMobile } from "./useMedia";

/* Money: "£180,000" as you type (the currency's own symbol, from Intl), the caret kept in place, the value in minor units. */

export function MoneyField({
  label,
  pence,
  currency,
  onChange,
  error,
  disabled,
  withPence = false,
}: {
  label: string;
  /** Whole minor units of `currency`. */
  pence: number | null;
  /** ISO 4217 code: the member's home currency for typed-in items. */
  currency: string;
  onChange: (pence: number | null) => void;
  error?: string | null;
  disabled?: boolean;
  /** Amounts paid ("£24.10") tidy to the currency's decimals when you leave the field; values ("£180,000") don't. */
  withPence?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => (pence === null ? "" : formatMoneyTyping(typedFromMinor(pence, currency, withPence), 0, currency).text));
  const caret = useRef<number | null>(null);

  useEffect(() => {
    if (caret.current !== null && ref.current && document.activeElement === ref.current) {
      ref.current.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  });

  return (
    <TextField
      ref={ref}
      label={label}
      labelStyle="form"
      inputMode="decimal"
      autoComplete="off"
      placeholder={`${currencySymbol(currency)}0`}
      value={text}
      error={error}
      disabled={disabled}
      onChange={(event) => {
        const next = formatMoneyTyping(event.target.value, event.target.selectionStart ?? event.target.value.length, currency);
        caret.current = next.caret;
        setText(next.text);
        onChange(parseTypedMinor(next.text, currency));
      }}
      onBlur={() => {
        const value = parseTypedMinor(text, currency);
        if (value === null) return;
        setText(formatMoneyTyping(typedFromMinor(value, currency, withPence), 0, currency).text);
      }}
    />
  );
}

/* The select: the design system's own list (keyboard and screen-reader accessible), see ui/Select. */

export function SelectField(props: { label: string; value: string; onChange: (value: string) => void; options: SelectOption[]; disabled?: boolean }) {
  return <Select {...props} />;
}

/* The calendar (30). A grid you can move around with the arrow keys. */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = [
  ["M", "Monday"],
  ["T", "Tuesday"],
  ["W", "Wednesday"],
  ["T", "Thursday"],
  ["F", "Friday"],
  ["S", "Saturday"],
  ["S", "Sunday"],
];

const parts = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month: month - 1, day };
};

const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
/** Monday first. */
const startOffset = (year: number, month: number) => (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;

function shift(iso: string, days: number) {
  const { year, month, day } = parts(iso);
  return toIso(year, month, day + days);
}

function shiftMonth(iso: string, months: number) {
  const { year, month, day } = parts(iso);
  const target = new Date(Date.UTC(year, month + months, 1));
  return toIso(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, daysIn(target.getUTCFullYear(), target.getUTCMonth())));
}

const chevronButton = `flex size-9 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-ground ${pressable}`;

export function Calendar({
  value,
  onSelect,
  initial,
  max,
}: {
  value: string | null;
  onSelect: (iso: string) => void;
  /** Where the calendar opens when there's no value yet. */
  initial?: string;
  max?: string;
}) {
  const [focus, setFocus] = useState(value ?? initial ?? todayIso());
  const [years, setYears] = useState(false);
  const { year, month } = parts(focus);
  const grid = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const titleId = useId();
  const { move } = useMotionTokens();
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus();
  }, [focus]);

  function go(next: string, keep = true) {
    if (max && next > max) next = max;
    const before = parts(focus);
    const after = parts(next);
    setDirection(after.year * 12 + after.month - (before.year * 12 + before.month));
    moved.current = keep;
    setFocus(next);
  }

  function onKey(event: KeyboardEvent<HTMLButtonElement>, iso: string) {
    const weekday = (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
    const moves: Record<string, () => string> = {
      ArrowLeft: () => shift(iso, -1),
      ArrowRight: () => shift(iso, 1),
      ArrowUp: () => shift(iso, -7),
      ArrowDown: () => shift(iso, 7),
      Home: () => shift(iso, -weekday),
      End: () => shift(iso, 6 - weekday),
      PageUp: () => shiftMonth(iso, event.shiftKey ? -12 : -1),
      PageDown: () => shiftMonth(iso, event.shiftKey ? 12 : 1),
    };
    const next = moves[event.key];
    if (!next) return;
    event.preventDefault();
    go(next());
  }

  const days = daysIn(year, month);
  const offset = startOffset(year, month);
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: days }, (_, index) => toIso(year, month, index + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));

  const thisYear = new Date().getFullYear();
  const lastYear = max ? parts(max).year : thisYear + 10;
  const yearList = Array.from({ length: lastYear - 1920 + 1 }, (_, index) => lastYear - index);

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <button
          type="button"
          id={titleId}
          aria-expanded={years}
          aria-label={`${MONTHS[month]} ${year}, choose a year`}
          onClick={() => setYears((open) => !open)}
          className={`flex h-9 cursor-pointer items-center gap-1 rounded-full px-2 -ml-2 text-[15px] font-semibold text-ink hover:bg-ground ${pressable}`}
        >
          {MONTHS[month]} {year}
          <ChevronDownIcon size={14} className={`text-ink-soft transition-transform duration-[var(--motion-fast)] ${years ? "rotate-180" : ""}`} />
        </button>
        {!years && (
          <span className="flex">
            <button type="button" aria-label="Previous month" onClick={() => go(shiftMonth(focus, -1), false)} className={chevronButton}>
              <ChevronLeftIcon size={18} />
            </button>
            <button
              type="button"
              aria-label="Next month"
              disabled={Boolean(max && shiftMonth(focus, 1).slice(0, 7) > max.slice(0, 7))}
              onClick={() => go(shiftMonth(focus, 1), false)}
              className={`${chevronButton} disabled:opacity-30`}
            >
              <ChevronRightIcon size={18} />
            </button>
          </span>
        )}
      </div>

      {years ? (
        <div className="grid max-h-[264px] grid-cols-4 gap-1 overflow-y-auto overscroll-contain">
          {yearList.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === year}
              onClick={() => {
                setYears(false);
                go(toIso(option, month, Math.min(parts(focus).day, daysIn(option, month))), false);
              }}
              className={`h-10 cursor-pointer rounded-full text-sm/[normal] ${pressable} ${
                option === year ? "bg-ink-deep font-semibold text-on-night" : "text-ink hover:bg-ground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <div role="grid" aria-labelledby={titleId} ref={grid} className="overflow-hidden">
          <div role="row" className="mb-1 grid grid-cols-7">
            {WEEKDAYS.map(([letter, name], index) => (
              <span key={index} role="columnheader" aria-label={name} className="text-center text-xs/[normal] font-semibold text-ink-soft">
                {letter}
              </span>
            ))}
          </div>
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={`${year}-${month}`}
              custom={direction}
              initial={{ opacity: 0, x: move(direction > 0 ? 24 : direction < 0 ? -24 : 0) }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: move(direction > 0 ? -24 : direction < 0 ? 24 : 0), transition: transition("fast") }}
              transition={transition("base")}
              className="flex flex-col gap-1"
            >
              {weeks.map((week, row) => (
                <div role="row" key={row} className="grid grid-cols-7">
                  {week.map((iso, column) => {
                    if (!iso) return <span key={column} role="gridcell" />;
                    const selected = iso === value;
                    const disabled = Boolean(max && iso > max);
                    return (
                      <span key={iso} role="gridcell" aria-selected={selected}>
                        <button
                          type="button"
                          data-day={iso}
                          tabIndex={iso === focus ? 0 : -1}
                          disabled={disabled}
                          aria-label={formatDate(iso)}
                          aria-current={iso === todayIso() ? "date" : undefined}
                          onKeyDown={(event) => onKey(event, iso)}
                          onClick={() => {
                            setFocus(iso);
                            onSelect(iso);
                          }}
                          className={`h-9 w-full cursor-pointer rounded-full text-sm/[normal] tabular-nums transition-colors duration-[var(--motion-fast)] disabled:cursor-default disabled:opacity-30 ${
                            selected ? "bg-ink-deep font-semibold text-on-night" : "text-ink hover:bg-ground"
                          }`}
                        >
                          {Number(iso.slice(8))}
                        </button>
                      </span>
                    );
                  })}
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* The date field: shows "3 March 2020", opens the calendar (a popover on desktop, a sheet on phones). */

export function DateField({
  name,
  label,
  value,
  onChange,
  placeholder = "Choose a date",
  initial,
  max,
  disabled,
  aside,
  overPage = false,
  align = "right",
}: {
  /** Unique on the page: the calendar opens as ?layer=date-{name}. */
  name: string;
  label: string;
  value: string | null;
  onChange: (iso: string) => void;
  placeholder?: string;
  initial?: string;
  max?: string;
  disabled?: boolean;
  aside?: ReactNode;
  /** On a page rather than inside an overlay: the phone sheet scales the page back. */
  overPage?: boolean;
  /** Which edge of the field the desktop popover lines up with. */
  align?: "left" | "right";
}) {
  const { layer, openLayer, closeLayer } = useLayers();
  const mobile = useMobile();
  const key = `date-${name}`;
  const open = layer === key;
  const id = useId();
  const popover = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLButtonElement>(null);
  const { move } = useMotionTokens();

  // Desktop popover: Esc and a click outside close it; focus goes back to the field.
  useEffect(() => {
    if (!open || mobile) return;
    const node = popover.current;
    requestAnimationFrame(() => node?.querySelector<HTMLButtonElement>("[data-day][tabindex='0']")?.focus());
    function onPointer(event: PointerEvent) {
      if (!node?.contains(event.target as Node) && !field.current?.contains(event.target as Node)) closeLayer();
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeLayer();
        field.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    node?.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      node?.removeEventListener("keydown", onKey);
    };
  }, [open, mobile, closeLayer]);

  return (
    <div className="@container relative">
      <div className="flex items-baseline justify-between gap-3">
        <span id={`${id}-label`} className="mb-1.5 block text-[13px] font-semibold text-ink">
          {label}
        </span>
        {aside}
      </div>
      <button
        ref={field}
        type="button"
        disabled={disabled}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? closeLayer() : openLayer(key))}
        className={`${fieldClasses()} flex cursor-pointer items-center justify-between gap-2 text-left disabled:opacity-50 ${
          open ? "border-ink-deep shadow-[inset_0_0_0_0.5px_var(--color-ink-deep)]" : ""
        }`}
      >
        <span id={`${id}-value`} className={`truncate ${value ? "text-ink" : "text-ink-soft/70"}`}>
          {value ? formatDate(value) : placeholder}
        </span>
        <ClockIcon size={17} className="flex-none text-ink-soft/70 @max-[180px]:hidden" />
      </button>

      {!mobile && (
        <AnimatePresence>
          {open && (
            <motion.div
              ref={popover}
              role="dialog"
              aria-label={label}
              initial={{ opacity: 0, y: move(-4), scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, transition: transition("fast") }}
              transition={transition("fast")}
              className={`absolute top-[84px] z-20 w-[300px] max-w-[calc(100vw-48px)] ${align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"} rounded-panel bg-card p-[18px] shadow-pop ring-1 ring-line`}
            >
              <Calendar
                value={value}
                initial={initial}
                max={max}
                onSelect={(iso) => {
                  onChange(iso);
                  closeLayer();
                  field.current?.focus();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {mobile && (
        <PhoneSheet open={open} onClose={closeLayer} overPage={overPage}>
          <DialogTitle size="sheet" className="mb-1">
            {label}
          </DialogTitle>
          <p className="mb-5 text-sm/[normal] text-ink-soft">{value ? formatDate(value) : placeholder}</p>
          <Calendar value={value} initial={initial} max={max} onSelect={onChange} />
          <div className="h-6" />
          <Button variant="inkDeep" size="block" onClick={closeLayer}>
            Done
          </Button>
        </PhoneSheet>
      )}
    </div>
  );
}

/** An inline error or success line under a form's button. */
export function FormNote({ error, saved }: { error: string | null; saved?: string | null }) {
  return <FormMessage message={error ?? saved ?? null} tone={error ? "error" : "success"} gapClassName="pt-3" />;
}
