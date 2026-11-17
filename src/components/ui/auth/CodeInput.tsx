"use client";

import { useState, type ChangeEvent, type ClipboardEvent, type Ref, type SyntheticEvent } from "react";

export const CODE_LENGTH = 6;

export type CodeInputState = "idle" | "error" | "checking" | "locked";

type CodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  state?: CodeInputState;
  /** Bump to replay the shake on a wrong code. */
  shakeKey?: number;
  readOnly?: boolean;
  describedBy?: string;
  ref?: Ref<HTMLInputElement>;
};

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, CODE_LENGTH);

const boxStyles = {
  idle: "border-line bg-ground text-ink",
  error: "border-alert bg-ground text-alert",
  checking: "border-line bg-card text-ink-soft/70",
  locked: "border-line bg-card text-ink-soft/70",
} as const;

/**
 * One real input drawn as six boxes, so paste, arrow keys, backspace and
 * iOS/Android one-time-code autofill all behave like a normal field.
 */
export default function CodeInput({
  value,
  onChange,
  state = "idle",
  shakeKey = 0,
  readOnly,
  describedBy,
  ref,
}: CodeInputProps) {
  const [focused, setFocused] = useState(false);
  // null means "at the end", so programmatic fills keep the caret in step.
  const [caret, setCaret] = useState<number | null>(null);

  const syncCaret = (event: SyntheticEvent<HTMLInputElement>) => {
    const { selectionStart, value: current } = event.currentTarget;
    setCaret(selectionStart === null || selectionStart >= current.length ? null : selectionStart);
  };

  const replace = (next: string) => {
    setCaret(null);
    onChange(digitsOnly(next));
  };

  // After a wrong code the next input starts over instead of editing the old digits.
  // Read from the change itself (not keydown) so Android keyboards and autofill work too.
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (state !== "error") {
      syncCaret(event);
      onChange(digitsOnly(raw));
    } else if (raw.length < value.length) {
      replace("");
    } else if (raw.length > value.length) {
      const end = event.target.selectionStart ?? raw.length;
      replace(raw.slice(end - (raw.length - value.length), end));
    } else {
      replace(raw);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    if (readOnly) return;
    event.preventDefault();
    replace(event.clipboardData.getData("text"));
  };

  const active = Math.min(caret ?? value.length, CODE_LENGTH - 1);
  const showFocus = focused && state === "idle" && !readOnly;

  return (
    <div className="relative">
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={state === "error" ? undefined : CODE_LENGTH}
        aria-label="6-digit code"
        aria-invalid={state === "error"}
        aria-describedby={describedBy}
        autoFocus
        value={value}
        readOnly={readOnly}
        disabled={state === "locked"}
        onChange={handleChange}
        onSelect={syncCaret}
        onPaste={handlePaste}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 z-10 size-full cursor-text bg-transparent text-base text-transparent caret-transparent outline-none selection:bg-transparent disabled:cursor-default"
      />
      <div key={shakeKey} aria-hidden="true" className={`flex gap-2 ${shakeKey ? "auth-shake" : ""}`}>
        {Array.from({ length: CODE_LENGTH }, (_, index) => {
          const digit = value[index];
          const isActive = showFocus && index === active;
          return (
            <div
              key={index}
              className={`flex h-[52px] flex-1 sm:h-[58px] items-center justify-center rounded-field border text-[22px] font-medium transition-[border-color,box-shadow,background-color,color] duration-200 ${
                boxStyles[state]
              } ${isActive ? "border-ink-deep ring-3 ring-ink-deep/14" : ""}`}
            >
              {digit ?? (isActive && <span className="h-[22px] w-[1.5px] bg-ink" />)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
